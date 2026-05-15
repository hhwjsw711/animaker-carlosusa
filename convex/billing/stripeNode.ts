"use node";

import { v, ConvexError } from "convex/values";
import Stripe from "stripe";
import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { action, type ActionCtx } from "../_generated/server";
import { components, internal } from "../_generated/api";
import { SUBSCRIPTION_PRICE_ENV, type SubscriptionCurrency } from "./packs";

/**
 * Node-only actions that talk directly to the Stripe SDK.
 *
 * Used for operations the `@convex-dev/stripe` component does not expose:
 *   - changePlan: prorated subscription upgrade/downgrade (price swap)
 *
 * The component still handles the webhook sync, so after these calls complete
 * Stripe fires `customer.subscription.updated` → our syncSubscription runs.
 */

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY env var is not set");
  _stripe = new Stripe(key);
  return _stripe;
}

const planChangeLimiter = new RateLimiter(components.rateLimiter, {
  planChangePerUser: {
    kind: "token bucket",
    rate: 5,
    period: MINUTE,
    capacity: 5,
  },
});

async function requireWorkspaceOwner(ctx: ActionCtx): Promise<{
  ownerUserId: string;
}> {
  const ws = await ctx.runQuery(
    internal.lib.workspace.resolveWorkspaceForAction,
    {},
  );
  if (!ws) throw new ConvexError({ code: "UNAUTHORIZED" });
  if ("error" in ws) throw new ConvexError({ code: ws.error });
  if (ws.isCollaborator) {
    throw new ConvexError({ code: "OWNER_ONLY" });
  }
  return { ownerUserId: ws.effectiveUserId };
}

function getPriceIdForPlan(
  planId: "starter" | "pro" | "business",
  currency: SubscriptionCurrency,
): string {
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

const paidPlanValidator = v.union(
  v.literal("starter"),
  v.literal("pro"),
  v.literal("business"),
);

const currencyValidator = v.union(v.literal("usd"), v.literal("brl"));

/**
 * Change the plan of the user's active subscription.
 *
 * - Upgrade (e.g. Starter → Pro): immediate, prorated — Stripe charges the
 *   difference for the remaining period and issues a credit on the next
 *   invoice if applicable.
 * - Downgrade (e.g. Pro → Starter): scheduled at period end via
 *   SubscriptionSchedule — no immediate charge or refund.
 *
 * Owner-only. Rate-limited to 5/min per workspace owner.
 */
export const changePlan = action({
  args: {
    targetPlanId: paidPlanValidator,
    currency: currencyValidator,
  },
  handler: async (ctx, { targetPlanId, currency }) => {
    const { ownerUserId } = await requireWorkspaceOwner(ctx);

    await planChangeLimiter.limit(ctx, "planChangePerUser", {
      key: ownerUserId,
      throws: true,
    });

    const subs = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId: ownerUserId },
    );
    const active = subs.find(
      (s) => s.status === "active" || s.status === "trialing",
    );
    if (!active) throw new ConvexError({ code: "NO_ACTIVE_SUBSCRIPTION" });

    const newPriceId = getPriceIdForPlan(targetPlanId, currency);
    if (active.priceId === newPriceId) {
      return {
        status: "unchanged" as const,
        subscriptionId: active.stripeSubscriptionId,
      };
    }

    const stripe = getStripe();
    const stripeSub = await stripe.subscriptions.retrieve(
      active.stripeSubscriptionId,
    );
    const currentItem = stripeSub.items.data[0];
    if (!currentItem) {
      throw new ConvexError({ code: "NO_SUBSCRIPTION_ITEM" });
    }

    // Determine upgrade vs downgrade by comparing monthly price amount.
    const currentAmount = currentItem.price.unit_amount ?? 0;
    const newPrice = await stripe.prices.retrieve(newPriceId);
    const newAmount = newPrice.unit_amount ?? 0;
    const isDowngrade = newAmount < currentAmount;

    if (isDowngrade) {
      // Schedule the swap at the end of the current billing period via
      // SubscriptionSchedule (the only way Stripe supports a true
      // "downgrade at period end" without immediate proration).
      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: active.stripeSubscriptionId,
      });
      const currentPhase = schedule.phases[0];
      if (!currentPhase) {
        throw new ConvexError({ code: "NO_SCHEDULE_PHASE" });
      }
      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: "release",
        phases: [
          {
            items: currentPhase.items.map((item) => ({
              price:
                typeof item.price === "string" ? item.price : item.price.id,
              quantity: item.quantity,
            })),
            start_date: currentPhase.start_date,
            end_date: currentPhase.end_date,
            proration_behavior: "none",
          },
          {
            items: [{ price: newPriceId, quantity: 1 }],
            duration: { interval: "month", interval_count: 1 },
            proration_behavior: "none",
            metadata: {
              planId: targetPlanId,
              currency,
            },
          },
        ],
        metadata: {
          planId: targetPlanId,
          currency,
          pendingDowngrade: "true",
        },
      });
      return {
        status: "scheduled" as const,
        subscriptionId: active.stripeSubscriptionId,
      };
    }

    // Upgrade — apply immediately with prorated invoice
    const updated = await stripe.subscriptions.update(
      active.stripeSubscriptionId,
      {
        proration_behavior: "create_prorations",
        items: [
          {
            id: currentItem.id,
            price: newPriceId,
          },
        ],
        metadata: {
          ...(stripeSub.metadata ?? {}),
          planId: targetPlanId,
          currency,
        },
      },
    );

    return {
      status: "upgraded" as const,
      subscriptionId: updated.id,
    };
  },
});
