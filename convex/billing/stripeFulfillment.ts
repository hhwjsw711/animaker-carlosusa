import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { components } from "../_generated/api";
import type { Id, Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { PLANS, type PlanId } from "./plans";
import { SUBSCRIPTION_PRICE_ENV } from "./packs";

/**
 * Resolve a Convex userId from a subscription or payment record.
 * Stripe metadata stores userId as a string; we treat it as Id<"users">.
 * Returns null if the user was deleted or the metadata is malformed.
 */
async function resolveUserId(
  ctx: MutationCtx,
  rawUserId: string | undefined | null,
): Promise<Id<"users"> | null> {
  if (!rawUserId) return null;
  // normalize() safely casts a string to an Id if it points to an existing row
  const normalized = ctx.db.normalizeId("users", rawUserId);
  if (!normalized) return null;
  const user = await ctx.db.get(normalized);
  return user ? normalized : null;
}

/**
 * Resolve a plan id from a Stripe price id by reading the env-configured map.
 * Since env vars are only available in actions/httpActions, we accept the
 * priceId and walk the map in-memory at mutation time (the map values come
 * from env, which IS accessible in mutations).
 */
function priceIdToPlan(priceId: string): PlanId | null {
  for (const [planId, byCurrency] of Object.entries(SUBSCRIPTION_PRICE_ENV)) {
    for (const envVar of Object.values(byCurrency)) {
      if (process.env[envVar] === priceId) {
        return planId as PlanId;
      }
    }
  }
  return null;
}

function priceIdToCurrency(priceId: string): "usd" | "brl" | null {
  for (const byCurrency of Object.values(SUBSCRIPTION_PRICE_ENV)) {
    if (process.env[byCurrency.usd] === priceId) return "usd";
    if (process.env[byCurrency.brl] === priceId) return "brl";
  }
  return null;
}

async function getOrInitBalance(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Doc<"creditBalances">> {
  const existing = await ctx.db
    .query("creditBalances")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (existing) return existing;

  // Shouldn't normally happen — auth callback initializes — but be defensive
  const plan = PLANS.free;
  const id = await ctx.db.insert("creditBalances", {
    userId,
    monthlyCredits: plan.monthlyCredits,
    monthlyCreditsReset: 0,
    addOnCredits: 0,
    dailyCredits: plan.dailyCredits,
    dailyCreditsReset: new Date().toISOString().slice(0, 10),
  });
  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to initialize credit balance");
  return created;
}

// ─── Credit pack fulfillment (one-time payment) ──────────────────────────────

export const fulfillCreditPack = internalMutation({
  args: {
    rawUserId: v.string(),
    credits: v.number(),
    stripePaymentIntentId: v.string(),
  },
  handler: async (ctx, { rawUserId, credits, stripePaymentIntentId }) => {
    // Idempotency: never credit the same paymentIntent twice
    const existing = await ctx.db
      .query("creditTransactions")
      .withIndex("by_stripePaymentIntentId", (q) =>
        q.eq("stripePaymentIntentId", stripePaymentIntentId),
      )
      .first();
    if (existing) {
      console.log(
        `[stripe-fulfillment] pack already fulfilled for paymentIntent=${stripePaymentIntentId}`,
      );
      return { status: "already_fulfilled" as const };
    }

    const userId = await resolveUserId(ctx, rawUserId);
    if (!userId) {
      console.error(
        `[stripe-fulfillment] pack fulfillment failed: unknown userId=${rawUserId} paymentIntent=${stripePaymentIntentId}`,
      );
      return { status: "user_not_found" as const };
    }

    if (!Number.isFinite(credits) || credits <= 0) {
      console.error(
        `[stripe-fulfillment] pack fulfillment failed: invalid credits=${credits}`,
      );
      return { status: "invalid_credits" as const };
    }

    const balance = await getOrInitBalance(ctx, userId);
    const newAddOn = balance.addOnCredits + credits;
    await ctx.db.patch(balance._id, { addOnCredits: newAddOn });

    const totalAfter = balance.dailyCredits + balance.monthlyCredits + newAddOn;
    await ctx.db.insert("creditTransactions", {
      userId,
      amount: credits,
      balanceAfter: totalAfter,
      source: "addon_purchase",
      description: "Credit pack purchase",
      stripePaymentIntentId,
      createdAt: Date.now(),
    });

    return { status: "fulfilled" as const };
  },
});

// ─── Subscription sync (created / updated) ────────────────────────────────────

export const syncSubscription = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, { stripeSubscriptionId }) => {
    const sub = await ctx.runQuery(components.stripe.public.getSubscription, {
      stripeSubscriptionId,
    });
    if (!sub) {
      console.warn(
        `[stripe-fulfillment] syncSubscription: subscription not yet in component db: ${stripeSubscriptionId}`,
      );
      return;
    }

    // Resolve user — first from subscription.userId (metadata), fallback to customer record
    let rawUserId: string | undefined =
      (sub.metadata as { userId?: string } | undefined)?.userId ?? sub.userId;

    if (!rawUserId) {
      const customer = await ctx.runQuery(
        components.stripe.public.getCustomer,
        { stripeCustomerId: sub.stripeCustomerId },
      );
      rawUserId = customer?.userId;
    }

    const userId = await resolveUserId(ctx, rawUserId);
    if (!userId) {
      console.error(
        `[stripe-fulfillment] syncSubscription: cannot resolve userId for ${stripeSubscriptionId}`,
      );
      return;
    }

    const planId = priceIdToPlan(sub.priceId);
    if (!planId) {
      console.error(
        `[stripe-fulfillment] syncSubscription: unknown priceId=${sub.priceId} for ${stripeSubscriptionId}`,
      );
      return;
    }
    const currency = priceIdToCurrency(sub.priceId);

    const normalizedStatus = normalizeStatus(sub.status);
    const existing = await ctx.db
      .query("userPlans")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    const patch = {
      planId,
      status: normalizedStatus,
      stripeCustomerId: sub.stripeCustomerId,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      stripePriceId: sub.priceId,
      currency: currency ?? undefined,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      canceledAt: sub.cancelAt ?? undefined,
      updatedAt: Date.now(),
    };

    const becameActive =
      (normalizedStatus === "active" || normalizedStatus === "trialing") &&
      (!existing ||
        existing.status !== "active" ||
        existing.planId !== planId);

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("userPlans", {
        userId,
        ...patch,
      });
    }

    // When a user first activates a paid plan (or changes plan), grant the
    // new plan's monthly credit allotment immediately so they don't have to
    // wait for the next refresh cycle. We REPLACE the monthly balance rather
    // than adding to avoid unbounded growth on rapid resync (and to match
    // SaaS norms — your monthly bucket is whatever the current plan gives).
    // Add-on (pack) credits are NEVER touched here.
    if (becameActive) {
      const plan = PLANS[planId];
      const balance = await getOrInitBalance(ctx, userId);
      const previousMonthly = balance.monthlyCredits;
      const newMonthly = plan.monthlyCredits;
      const nextReset = Date.now() + 30 * 24 * 60 * 60 * 1000;
      await ctx.db.patch(balance._id, {
        monthlyCredits: newMonthly,
        monthlyCreditsReset: nextReset,
      });
      const totalAfter =
        newMonthly + balance.dailyCredits + balance.addOnCredits;
      const delta = newMonthly - previousMonthly;
      const wasFirstActivation = !existing;
      await ctx.db.insert("creditTransactions", {
        userId,
        amount: delta,
        balanceAfter: totalAfter,
        source: "subscription_grant",
        description: wasFirstActivation
          ? `Subscription activated: ${planId}`
          : `Plan changed to ${planId}`,
        createdAt: Date.now(),
      });
    }
  },
});

// ─── Subscription canceled (end of life) ──────────────────────────────────────

export const markSubscriptionCanceled = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, { stripeSubscriptionId }) => {
    const existing = await ctx.db
      .query("userPlans")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId),
      )
      .unique();
    if (!existing) return;

    // Pin the credit balance so the next refresh cycle doesn't reset
    // accumulated credits to the free-plan ceiling. Set monthlyCreditsReset
    // to the sentinel 0 (never resets) — leftover credits stay until the
    // user uses them or buys a new plan.
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_userId", (q) => q.eq("userId", existing.userId))
      .unique();
    if (balance && balance.monthlyCreditsReset !== 0) {
      await ctx.db.patch(balance._id, { monthlyCreditsReset: 0 });
    }

    await ctx.db.patch(existing._id, {
      planId: "free",
      status: "canceled",
      cancelAtPeriodEnd: false,
      canceledAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ─── Reconciliation cron ─────────────────────────────────────────────────────
//
// Walks every userPlan with a stripeSubscriptionId and re-syncs it from the
// component db. Catches divergences caused by missed/dropped webhooks. Runs
// daily and is safe to invoke manually for debugging.

export const reconcileSubscriptions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db.query("userPlans").take(1000);
    let checked = 0;
    let resynced = 0;

    for (const plan of plans) {
      if (!plan.stripeSubscriptionId) continue;
      checked++;

      const sub = await ctx.runQuery(components.stripe.public.getSubscription, {
        stripeSubscriptionId: plan.stripeSubscriptionId,
      });
      if (!sub) {
        console.warn(
          `[reconcile] subscription ${plan.stripeSubscriptionId} missing in component db`,
        );
        continue;
      }

      const status = normalizeStatus(sub.status);
      const drift =
        plan.status !== status ||
        plan.cancelAtPeriodEnd !== sub.cancelAtPeriodEnd ||
        (plan.currentPeriodEnd ?? 0) !== sub.currentPeriodEnd ||
        plan.stripePriceId !== sub.priceId;

      if (drift) {
        const planId = priceIdToPlan(sub.priceId) ?? plan.planId;
        await ctx.db.patch(plan._id, {
          planId,
          status,
          stripePriceId: sub.priceId,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          updatedAt: Date.now(),
        });
        resynced++;
        console.log(
          `[reconcile] resynced ${plan.stripeSubscriptionId}: ${plan.status}→${status}, ${plan.planId}→${planId}`,
        );
      }
    }

    console.log(`[reconcile] checked=${checked} resynced=${resynced}`);
    return { checked, resynced };
  },
});

// ─── Invoice payment failed → mark past_due ──────────────────────────────────

export const markPastDue = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, { stripeSubscriptionId }) => {
    const existing = await ctx.db
      .query("userPlans")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", stripeSubscriptionId),
      )
      .unique();
    if (!existing) return;

    await ctx.db.patch(existing._id, {
      status: "past_due",
      updatedAt: Date.now(),
    });
  },
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function normalizeStatus(
  stripeStatus: string,
): Doc<"userPlans">["status"] {
  switch (stripeStatus) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return stripeStatus;
    default:
      return "incomplete";
  }
}
