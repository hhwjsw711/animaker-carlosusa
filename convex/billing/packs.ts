export type PackId = "small" | "medium" | "large";

export const PACK_IDS: readonly PackId[] = ["small", "medium", "large"] as const;

export interface CreditPack {
  credits: number;
  priceUsdCents: number;
  priceBrlCents: number;
  /** Env var that holds the Stripe Price ID for USD */
  priceEnvVarUsd: string;
  /** Env var that holds the Stripe Price ID for BRL */
  priceEnvVarBrl: string;
}

/**
 * Credit packs — one-time purchases that add to `addOnCredits` (never expire).
 *
 * Pricing rationale: per-credit price is slightly above the Pro subscription
 * ($0.0029/credit) to incentivize recurring plans, but with volume discount:
 *   - Small:  $4  / 1000  = $0.0040/credit
 *   - Medium: $18 / 5000  = $0.0036/credit
 *   - Large:  $50 / 15000 = $0.0033/credit
 *
 * BRL pricing uses a flat 5x ratio to match the subscription plan conversion.
 *
 * The actual Stripe Price IDs must be created manually in the Stripe Dashboard
 * (one per currency) and wired via environment variables — we never hardcode
 * them in the codebase to avoid dev/prod mix-ups.
 */
export const CREDIT_PACKS: Record<PackId, CreditPack> = {
  small: {
    credits: 1_000,
    priceUsdCents: 400,
    priceBrlCents: 2_000,
    priceEnvVarUsd: "STRIPE_PRICE_PACK_SMALL_USD",
    priceEnvVarBrl: "STRIPE_PRICE_PACK_SMALL_BRL",
  },
  medium: {
    credits: 5_000,
    priceUsdCents: 1_800,
    priceBrlCents: 9_000,
    priceEnvVarUsd: "STRIPE_PRICE_PACK_MEDIUM_USD",
    priceEnvVarBrl: "STRIPE_PRICE_PACK_MEDIUM_BRL",
  },
  large: {
    credits: 15_000,
    priceUsdCents: 5_000,
    priceBrlCents: 25_000,
    priceEnvVarUsd: "STRIPE_PRICE_PACK_LARGE_USD",
    priceEnvVarBrl: "STRIPE_PRICE_PACK_LARGE_BRL",
  },
};

export type SubscriptionCurrency = "usd" | "brl";

/**
 * Subscription price envs — one per plan per currency. Set in Convex dashboard
 * after creating the Products/Prices in Stripe.
 */
export const SUBSCRIPTION_PRICE_ENV: Record<
  "starter" | "pro" | "business",
  Record<SubscriptionCurrency, string>
> = {
  starter: {
    usd: "STRIPE_PRICE_STARTER_USD",
    brl: "STRIPE_PRICE_STARTER_BRL",
  },
  pro: {
    usd: "STRIPE_PRICE_PRO_USD",
    brl: "STRIPE_PRICE_PRO_BRL",
  },
  business: {
    usd: "STRIPE_PRICE_BUSINESS_USD",
    brl: "STRIPE_PRICE_BUSINESS_BRL",
  },
};

export function getPackPriceEnvVar(
  packId: PackId,
  currency: SubscriptionCurrency,
): string {
  const pack = CREDIT_PACKS[packId];
  return currency === "usd" ? pack.priceEnvVarUsd : pack.priceEnvVarBrl;
}
