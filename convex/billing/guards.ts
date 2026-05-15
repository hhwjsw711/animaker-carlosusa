import { ConvexError } from "convex/values";
import type { ActionCtx, QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import {
  PLANS,
  FALLBACK_PLAN,
  type PlanId,
  type PlanLimits,
} from "./plans";

/**
 * Pre-check helper for actions. Call this BEFORE making any paid LLM/tool call
 * so the user is blocked from incurring provider costs they can't pay for.
 *
 * Throws a structured ConvexError with code "INSUFFICIENT_CREDITS" that the
 * frontend can catch to open the InsufficientCreditsDialog.
 */
export async function assertHasCredits(
  ctx: ActionCtx,
  userId: Id<"users">,
  minCredits = 1,
): Promise<void> {
  let balance = await ctx.runQuery(internal.billing.credits.getBalanceInternal, {
    userId,
  });

  if (balance === null) {
    await ctx.runMutation(internal.billing.credits.initializeCredits, { userId });
    balance = await ctx.runQuery(internal.billing.credits.getBalanceInternal, {
      userId,
    });
  }

  const available = balance ?? 0;
  if (available < minCredits) {
    throw new ConvexError({
      code: "INSUFFICIENT_CREDITS",
      required: minCredits,
      available,
    });
  }
}

// ─── Plan limit enforcement ──────────────────────────────────────────────────

/**
 * Resolve the user's current active plan. Non-active subscriptions (past_due,
 * canceled, paused) fall back to the free plan so downgraded users still work
 * within free-tier limits.
 */
export async function getUserPlan(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<{ planId: PlanId; limits: PlanLimits }> {
  const userPlan = await ctx.db
    .query("userPlans")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  const planId: PlanId =
    userPlan && (userPlan.status === "active" || userPlan.status === "trialing")
      ? userPlan.planId
      : FALLBACK_PLAN;

  return { planId, limits: PLANS[planId] };
}

type LimitResource =
  | "customers"
  | "services"
  | "products"
  | "collaborators"
  | "agents";

const RESOURCE_TO_LIMIT: Record<LimitResource, keyof PlanLimits> = {
  customers: "maxCustomers",
  services: "maxServices",
  products: "maxProducts",
  collaborators: "maxCollaborators",
  agents: "maxAgents",
};

/**
 * Counts current records of a resource for a user and throws a structured
 * ConvexError("PLAN_LIMIT_EXCEEDED") if adding one more would exceed the plan.
 *
 * Uses .take(limit + 1) for O(limit) perf instead of .collect() — fine for
 * our plan caps (max 200 on Pro, unlimited on Business).
 */
export async function assertPlanLimit(
  ctx: MutationCtx,
  userId: Id<"users">,
  resource: LimitResource,
): Promise<void> {
  const { planId, limits } = await getUserPlan(ctx, userId);
  const max = limits[RESOURCE_TO_LIMIT[resource]];
  if (!Number.isFinite(max)) return; // Infinity = unlimited

  const maxNum = max as number;
  let count: number;

  switch (resource) {
    case "customers":
      count = (
        await ctx.db
          .query("customers")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .take(maxNum + 1)
      ).length;
      break;
    case "services":
      count = (
        await ctx.db
          .query("services")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .take(maxNum + 1)
      ).length;
      break;
    case "products":
      count = (
        await ctx.db
          .query("products")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .take(maxNum + 1)
      ).length;
      break;
    case "collaborators":
      count = (
        await ctx.db
          .query("collaborators")
          .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
          .take(maxNum + 1)
      ).length;
      break;
    case "agents":
      count = (
        await ctx.db
          .query("scheduledTasks")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .take(maxNum + 1)
      ).length;
      break;
  }

  if (count >= maxNum) {
    throw new ConvexError({
      code: "PLAN_LIMIT_EXCEEDED",
      resource,
      planId,
      limit: maxNum,
      current: count,
    });
  }
}
