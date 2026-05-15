import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTopBarActions } from "@/components/layout/top-bar-actions-context";
import useNavigationStore from "@/stores/navigation";
import Spinner from "@/components/ui/custom/spinner";
import { useBillingRedirect } from "@/hooks/use-billing-redirect";
import { UsageCreditBalanceCard } from "./usage-credit-balance-card";
import { UsageStorageCard } from "./usage-storage-card";
import { UsageDailyChart } from "./usage-daily-chart";
import { UsageSourceBreakdownCard } from "./usage-source-breakdown-card";
import { UsageTransactionList } from "./usage-transaction-list";
import { UsageSubscriptionCard } from "./usage-subscription-card";
import { UsagePlansGrid } from "./usage-plans-grid";
import { UsagePacksGrid } from "./usage-packs-grid";

export function UsageLayout() {
  const { setTopBarActions } = useTopBarActions()!;
  const isActive = useNavigationStore((s) => s.activePage === "usage");

  useBillingRedirect();

  const balance = useQuery(api.billing.credits.getBalance);
  const planLimits = useQuery(api.billing.credits.getMyPlanLimits);
  const subscription = useQuery(api.billing.stripe.getMySubscription);
  const usageHistory = useQuery(api.usage.queries.getUsageHistory, { days: 30 });
  const storageUsage = useQuery(api.usage.storage.getMyStorageUsage);
  const transactions = useQuery(api.billing.credits.getTransactionHistory, { days: 30 });

  useEffect(() => {
    if (!isActive) return;
    setTopBarActions(null);
  }, [isActive, setTopBarActions]);

  if (
    balance === undefined ||
    planLimits === undefined ||
    subscription === undefined
  ) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!balance || !planLimits) return null;

  // Currency preference: derive from active subscription or fall back to
  // locale-based default. Browser Portuguese → BRL, otherwise USD.
  const currency: "usd" | "brl" =
    subscription?.currency ??
    (typeof navigator !== "undefined" && navigator.language.startsWith("pt")
      ? "brl"
      : "usd");

  const currentPlanId = subscription?.planId ?? "free";
  const hasStripeSub = !!subscription?.stripeSubscriptionId;

  return (
    <main className="flex flex-1 flex-col overflow-y-auto min-h-0">
      <div className="p-4 space-y-4 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UsageCreditBalanceCard balance={balance} planLimits={planLimits} />
          <UsageSubscriptionCard subscription={subscription} />
        </div>

        <UsagePlansGrid
          currentPlanId={currentPlanId}
          currency={currency}
          hasStripeSub={hasStripeSub}
        />

        <UsagePacksGrid currency={currency} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UsageStorageCard storageUsage={storageUsage} planLimits={planLimits} />
          <UsageSourceBreakdownCard usageHistory={usageHistory} />
        </div>

        <UsageDailyChart usageHistory={usageHistory} />

        <UsageTransactionList transactions={transactions} />
      </div>
    </main>
  );
}
