export type PlanId = "free" | "starter" | "pro" | "business";

export const PLAN_IDS: readonly PlanId[] = [
  "free",
  "starter",
  "pro",
  "business",
] as const;

export interface PlanLimits {
  monthlyCredits: number;
  dailyCredits: number;
  maxCustomers: number;
  maxServices: number;
  maxProducts: number;
  maxCollaborators: number;
  maxConcurrentTasks: number;
  maxAgents: number;
  maxStorageBytes: number;
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    monthlyCredits: 150,
    dailyCredits: 0,
    maxCustomers: 10,
    maxServices: 10,
    maxProducts: 10,
    maxCollaborators: 0,
    maxConcurrentTasks: 1,
    maxAgents: 1,
    maxStorageBytes: 500 * 1024 * 1024, // 500 MB
  },
  starter: {
    monthlyCredits: 3_000,
    dailyCredits: 0,
    maxCustomers: 50,
    maxServices: 50,
    maxProducts: 50,
    maxCollaborators: 3,
    maxConcurrentTasks: 5,
    maxAgents: 5,
    maxStorageBytes: 2 * 1024 * 1024 * 1024, // 2 GB
  },
  pro: {
    monthlyCredits: 10_000,
    dailyCredits: 0,
    maxCustomers: 200,
    maxServices: 200,
    maxProducts: 200,
    maxCollaborators: 10,
    maxConcurrentTasks: 10,
    maxAgents: 10,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
  },
  business: {
    monthlyCredits: 30_000,
    dailyCredits: 0,
    maxCustomers: Infinity,
    maxServices: Infinity,
    maxProducts: Infinity,
    maxCollaborators: Infinity,
    maxConcurrentTasks: 20,
    maxAgents: 20,
    maxStorageBytes: 50 * 1024 * 1024 * 1024, // 50 GB
  },
};

// New users start on the free plan. Paid plans are assigned via Stripe webhook.
export const FALLBACK_PLAN: PlanId = "free";

export function getPlanLimits(planId: PlanId | null | undefined): PlanLimits {
  if (planId && planId in PLANS) return PLANS[planId];
  return PLANS[FALLBACK_PLAN];
}
