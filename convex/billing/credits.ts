import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";
import { PLANS, FALLBACK_PLAN, getPlanLimits, type PlanId } from "./plans";

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function getUserPlanId(
  ctx: { db: QueryCtx["db"] | MutationCtx["db"] },
  userId: Id<"users">,
): Promise<PlanId> {
  const userPlan = await ctx.db
    .query("userPlans")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  if (!userPlan) return FALLBACK_PLAN;

  // Non-active statuses fall back to free limits until payment recovers.
  // "paused" = free plan with depleted one-shot credits (no subscription yet).
  if (userPlan.status === "active" || userPlan.status === "trialing") {
    return userPlan.planId;
  }
  return FALLBACK_PLAN;
}

async function getBalanceDoc(
  ctx: { db: QueryCtx["db"] | MutationCtx["db"] },
  userId: Id<"users">,
): Promise<Doc<"creditBalances"> | null> {
  return await ctx.db
    .query("creditBalances")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Queries ────────────────────────────────────────────────────────────────────

export const getBalance = query({
  args: {},
  handler: async (ctx) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    const balance = await getBalanceDoc(ctx, ws.effectiveUserId);
    if (!balance) return { daily: 0, monthly: 0, addOn: 0, total: 0 };

    return {
      daily: balance.dailyCredits,
      monthly: balance.monthlyCredits,
      addOn: balance.addOnCredits,
      total: balance.dailyCredits + balance.monthlyCredits + balance.addOnCredits,
    };
  },
});

export const getTransactionHistory = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days = 30 }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    const since = new Date();
    since.setDate(since.getDate() - Math.min(Math.max(days, 1), 365));
    const sinceTs = since.getTime();

    return await ctx.db
      .query("creditTransactions")
      .withIndex("by_userId_and_createdAt", (q) =>
        q.eq("userId", ws.effectiveUserId).gte("createdAt", sinceTs),
      )
      .take(500);
  },
});

export const getMyPlanLimits = query({
  args: {},
  handler: async (ctx) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    const planId = await getUserPlanId(ctx, ws.effectiveUserId);
    const plan = getPlanLimits(planId);
    return {
      planId,
      monthlyCredits: plan.monthlyCredits,
      dailyCredits: plan.dailyCredits,
      maxStorageBytes: plan.maxStorageBytes,
      maxCustomers: plan.maxCustomers,
      maxServices: plan.maxServices,
      maxProducts: plan.maxProducts,
      maxCollaborators: plan.maxCollaborators,
      maxConcurrentTasks: plan.maxConcurrentTasks,
      maxAgents: plan.maxAgents,
    };
  },
});

// ─── Internal Queries ───────────────────────────────────────────────────────────

export const getBalanceInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const balance = await getBalanceDoc(ctx, userId);
    if (!balance) return null;
    return balance.dailyCredits + balance.monthlyCredits + balance.addOnCredits;
  },
});

// ─── Internal Mutations ─────────────────────────────────────────────────────────

export const initializeCredits = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const existing = await getBalanceDoc(ctx, userId);
    if (existing) return;

    // New users always start on the free plan with one-shot 150 credits.
    // No auto-refresh — when depleted, they must subscribe or buy a pack.
    const plan = PLANS[FALLBACK_PLAN];
    await ctx.db.insert("creditBalances", {
      userId,
      monthlyCredits: plan.monthlyCredits,
      monthlyCreditsReset: 0, // sentinel: never resets
      addOnCredits: 0,
      dailyCredits: plan.dailyCredits,
      dailyCreditsReset: todayString(),
    });
  },
});

/**
 * Post-usage deduction. Runs inside `trackUsage` after the LLM call completes,
 * so it cannot block the operation. Deducts what it can (daily → monthly →
 * addon) and lets the next pre-check (`assertHasCredits`) reject further work.
 *
 * Callers that want to prevent overconsumption MUST pre-check with
 * `assertHasCredits` in the action BEFORE making the paid call.
 */
export async function consumeCreditsHelper(
  ctx: MutationCtx,
  userId: Id<"users">,
  amount: number,
  source: string,
  description?: string,
) {
  if (amount <= 0) return;

  const balance = await getBalanceDoc(ctx, userId);
  if (!balance) {
    console.error(`[consumeCredits] No balance record for user ${userId}`);
    return;
  }

  const planId = await getUserPlanId(ctx, userId);

  await maybeRefreshMonthly(ctx, balance, planId);
  await maybeRefreshDaily(ctx, balance, planId);

  let remaining = amount;
  let newDaily = balance.dailyCredits;
  let newMonthly = balance.monthlyCredits;
  let newAddOn = balance.addOnCredits;

  if (remaining > 0 && newDaily > 0) {
    const deduct = Math.min(remaining, newDaily);
    newDaily -= deduct;
    remaining -= deduct;
  }
  if (remaining > 0 && newMonthly > 0) {
    const deduct = Math.min(remaining, newMonthly);
    newMonthly -= deduct;
    remaining -= deduct;
  }
  if (remaining > 0 && newAddOn > 0) {
    const deduct = Math.min(remaining, newAddOn);
    newAddOn -= deduct;
    remaining -= deduct;
  }

  const actualDeducted = amount - remaining;
  const totalAfter = newDaily + newMonthly + newAddOn;

  await ctx.db.patch(balance._id, {
    dailyCredits: newDaily,
    monthlyCredits: newMonthly,
    addOnCredits: newAddOn,
  });

  if (actualDeducted > 0) {
    await ctx.db.insert("creditTransactions", {
      userId,
      amount: -actualDeducted,
      balanceAfter: totalAfter,
      source: source as Doc<"creditTransactions">["source"],
      description,
      createdAt: Date.now(),
    });
  }

  if (remaining > 0) {
    console.warn(
      `[consumeCredits] User ${userId} overconsumed: requested=${amount.toFixed(2)}, deducted=${actualDeducted.toFixed(2)}, debt=${remaining.toFixed(2)} (plan=${planId})`,
    );
  }
}

// ─── Refresh cycles ─────────────────────────────────────────────────────────────

async function maybeRefreshMonthly(
  ctx: MutationCtx,
  balance: Doc<"creditBalances">,
  planId: PlanId,
) {
  // Sentinel 0 = never resets (free plan one-shot credits)
  if (balance.monthlyCreditsReset === 0) return;

  const now = Date.now();
  if (now < balance.monthlyCreditsReset) return;

  const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
  const plan = getPlanLimits(planId);
  const nextReset = now + MONTH_MS;
  const previousBalance = balance.monthlyCredits;

  await ctx.db.patch(balance._id, {
    monthlyCredits: plan.monthlyCredits,
    monthlyCreditsReset: nextReset,
  });

  const totalAfter = plan.monthlyCredits + balance.dailyCredits + balance.addOnCredits;
  const refreshAmount = plan.monthlyCredits - previousBalance;
  if (refreshAmount > 0) {
    await ctx.db.insert("creditTransactions", {
      userId: balance.userId,
      amount: refreshAmount,
      balanceAfter: totalAfter,
      source: "monthly_refresh",
      createdAt: Date.now(),
    });
  }

  balance.monthlyCredits = plan.monthlyCredits;
  balance.monthlyCreditsReset = nextReset;
}

async function maybeRefreshDaily(
  ctx: MutationCtx,
  balance: Doc<"creditBalances">,
  planId: PlanId,
) {
  const today = todayString();
  if (balance.dailyCreditsReset === today) return;

  const plan = getPlanLimits(planId);
  if (plan.dailyCredits === 0) return;

  const previousBalance = balance.dailyCredits;

  await ctx.db.patch(balance._id, {
    dailyCredits: plan.dailyCredits,
    dailyCreditsReset: today,
  });

  const totalAfter = plan.dailyCredits + balance.monthlyCredits + balance.addOnCredits;
  const refreshAmount = plan.dailyCredits - previousBalance;
  if (refreshAmount > 0) {
    await ctx.db.insert("creditTransactions", {
      userId: balance.userId,
      amount: refreshAmount,
      balanceAfter: totalAfter,
      source: "daily_refresh",
      createdAt: Date.now(),
    });
  }

  balance.dailyCredits = plan.dailyCredits;
  balance.dailyCreditsReset = today;
}
