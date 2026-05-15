import { v, ConvexError } from "convex/values";
import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { action, query } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { StripeSubscriptions } from "@convex-dev/stripe";
import { tryResolveWorkspaceUserId } from "../lib/workspace";
import {
  CREDIT_PACKS,
  SUBSCRIPTION_PRICE_ENV,
  getPackPriceEnvVar,
  type PackId,
  type SubscriptionCurrency,
} from "./packs";
import type { PlanId } from "./plans";
import type { ActionCtx } from "../_generated/server";

const stripeClient = new StripeSubscriptions(components.stripe, {});

// Per-user rate limit on checkout/portal creation to prevent abuse.
// 5 attempts per minute per user is generous for legitimate use, restrictive
// enough to prevent automated misuse against the Stripe API.
const checkoutLimiter = new RateLimiter(components.rateLimiter, {
  checkoutPerUser: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
});

function getAppUrl(): string {
  const url = process.env.APP_URL;
  if (!url) throw new Error("APP_URL env var is not set");
  return url.replace(/\/$/, "");
}

/**
 * Resolves the workspace owner for an action. Throws if unauthenticated or
 * if the caller is a collaborator (only the workspace owner can manage
 * billing — collaborators share the owner's plan but cannot purchase).
 */
async function requireWorkspaceOwner(ctx: ActionCtx): Promise<{
  ownerUserId: string;
}> {
  const ws = await ctx.runQuery(internal.lib.workspace.resolveWorkspaceForAction, {});
  if (!ws) throw new ConvexError({ code: "UNAUTHORIZED" });
  if ("error" in ws) throw new ConvexError({ code: ws.error });
  if (ws.isCollaborator) {
    throw new ConvexError({ code: "OWNER_ONLY" });
  }
  return { ownerUserId: ws.effectiveUserId };
}

function getPriceIdForPlan(planId: "starter" | "pro" | "business", currency: SubscriptionCurrency): string {
  const envVar = SUBSCRIPTION_PRICE_ENV[planId][currency];
  const priceId = process.env[envVar];
  if (!priceId) {
    throw new ConvexError({
      code: "STRIPE_PRICE_NOT_CONFIGURED",
      planId,
      currency,
      envVar,
    });
  }
  return priceId;
}

function getPriceIdForPack(packId: PackId, currency: SubscriptionCurrency): string {
  const envVar = getPackPriceEnvVar(packId, currency);
  const priceId = process.env[envVar];
  if (!priceId) {
    throw new ConvexError({
      code: "STRIPE_PRICE_NOT_CONFIGURED",
      packId,
      currency,
      envVar,
    });
  }
  return priceId;
}

const paidPlanValidator = v.union(
  v.literal("starter"),
  v.literal("pro"),
  v.literal("business"),
);

const packIdValidator = v.union(
  v.literal("small"),
  v.literal("medium"),
  v.literal("large"),
);

const currencyValidator = v.union(v.literal("usd"), v.literal("brl"));

// ─── Queries ────────────────────────────────────────────────────────────────

export const getMySubscription = query({
  args: {},
  handler: async (ctx) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    const userPlan = await ctx.db
      .query("userPlans")
      .withIndex("by_userId", (q) => q.eq("userId", ws.effectiveUserId))
      .unique();

    if (!userPlan) {
      return {
        planId: "free" as PlanId,
        status: "active" as const,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: null,
        currency: null,
      };
    }

    return {
      planId: userPlan.planId,
      status: userPlan.status,
      currentPeriodEnd: userPlan.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: userPlan.cancelAtPeriodEnd,
      stripeSubscriptionId: userPlan.stripeSubscriptionId ?? null,
      currency: userPlan.currency ?? null,
    };
  },
});

// ─── Actions ────────────────────────────────────────────────────────────────

export const createSubscriptionCheckout = action({
  args: {
    planId: paidPlanValidator,
    currency: currencyValidator,
  },
  handler: async (ctx, { planId, currency }) => {
    const { ownerUserId } = await requireWorkspaceOwner(ctx);

    await checkoutLimiter.limit(ctx, "checkoutPerUser", {
      key: ownerUserId,
      throws: true,
    });

    const identity = await ctx.auth.getUserIdentity();

    const { customerId } = await stripeClient.getOrCreateCustomer(ctx, {
      userId: ownerUserId,
      email: identity?.email ?? undefined,
      name: identity?.name ?? undefined,
    });

    const priceId = getPriceIdForPlan(planId, currency);
    const appUrl = getAppUrl();

    return await stripeClient.createCheckoutSession(ctx, {
      priceId,
      customerId,
      mode: "subscription",
      successUrl: `${appUrl}/usage?checkout=success`,
      cancelUrl: `${appUrl}/usage?checkout=canceled`,
      subscriptionMetadata: {
        userId: ownerUserId,
        planId,
        currency,
      },
    });
  },
});

export const createPackCheckout = action({
  args: {
    packId: packIdValidator,
    currency: currencyValidator,
  },
  handler: async (ctx, { packId, currency }) => {
    const { ownerUserId } = await requireWorkspaceOwner(ctx);

    await checkoutLimiter.limit(ctx, "checkoutPerUser", {
      key: ownerUserId,
      throws: true,
    });

    const identity = await ctx.auth.getUserIdentity();
    const pack = CREDIT_PACKS[packId];

    const { customerId } = await stripeClient.getOrCreateCustomer(ctx, {
      userId: ownerUserId,
      email: identity?.email ?? undefined,
      name: identity?.name ?? undefined,
    });

    const priceId = getPriceIdForPack(packId, currency);
    const appUrl = getAppUrl();

    return await stripeClient.createCheckoutSession(ctx, {
      priceId,
      customerId,
      mode: "payment",
      successUrl: `${appUrl}/usage?checkout=success&pack=${packId}`,
      cancelUrl: `${appUrl}/usage?checkout=canceled`,
      paymentIntentMetadata: {
        userId: ownerUserId,
        packId,
        credits: String(pack.credits),
        currency,
      },
    });
  },
});

export const createCustomerPortalSession = action({
  args: {},
  handler: async (ctx) => {
    const { ownerUserId } = await requireWorkspaceOwner(ctx);

    await checkoutLimiter.limit(ctx, "checkoutPerUser", {
      key: ownerUserId,
      throws: true,
    });

    const subs = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId: ownerUserId },
    );

    // Fall back to payments if the user never subscribed but bought a pack
    let stripeCustomerId: string | null = null;
    if (subs.length > 0) {
      stripeCustomerId = subs[0].stripeCustomerId;
    } else {
      const payments = await ctx.runQuery(
        components.stripe.public.listPaymentsByUserId,
        { userId: ownerUserId },
      );
      if (payments.length > 0 && payments[0].stripeCustomerId) {
        stripeCustomerId = payments[0].stripeCustomerId;
      }
    }

    if (!stripeCustomerId) {
      throw new ConvexError({ code: "NO_STRIPE_CUSTOMER" });
    }

    const appUrl = getAppUrl();
    return await stripeClient.createCustomerPortalSession(ctx, {
      customerId: stripeCustomerId,
      returnUrl: `${appUrl}/usage`,
    });
  },
});

export const cancelMySubscription = action({
  args: { cancelAtPeriodEnd: v.optional(v.boolean()) },
  handler: async (ctx, { cancelAtPeriodEnd = true }) => {
    const { ownerUserId } = await requireWorkspaceOwner(ctx);

    const subs = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId: ownerUserId },
    );
    const active = subs.find(
      (s) => s.status === "active" || s.status === "trialing",
    );
    if (!active) throw new ConvexError({ code: "NO_ACTIVE_SUBSCRIPTION" });

    await stripeClient.cancelSubscription(ctx, {
      stripeSubscriptionId: active.stripeSubscriptionId,
      cancelAtPeriodEnd,
    });

    return null;
  },
});

export const reactivateMySubscription = action({
  args: {},
  handler: async (ctx) => {
    const { ownerUserId } = await requireWorkspaceOwner(ctx);

    const subs = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId: ownerUserId },
    );
    const pending = subs.find((s) => s.cancelAtPeriodEnd);
    if (!pending) throw new ConvexError({ code: "NO_PENDING_CANCELLATION" });

    await stripeClient.reactivateSubscription(ctx, {
      stripeSubscriptionId: pending.stripeSubscriptionId,
    });

    return null;
  },
});
