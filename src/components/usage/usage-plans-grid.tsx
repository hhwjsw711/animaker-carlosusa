import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction } from "convex/react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Spinner from "@/components/ui/custom/spinner";
import { api } from "../../../convex/_generated/api";
import { formatNumber } from "./usage-helpers";

type PaidPlanId = "starter" | "pro" | "business";

// IMPORTANT: keep these prices and limits in sync with:
//   - convex/billing/plans.ts (authoritative limits)
//   - Stripe Dashboard products (authoritative prices)
// The Stripe Price IDs themselves live in env vars (STRIPE_PRICE_*).
const PAID_PLANS: ReadonlyArray<{
  id: PaidPlanId;
  priceUsd: number;
  priceBrl: number;
  credits: number;
  maxCustomers: number | null;
  maxCollaborators: number | null;
  popular?: boolean;
}> = [
  {
    id: "starter",
    priceUsd: 9,
    priceBrl: 49,
    credits: 3_000,
    maxCustomers: 50,
    maxCollaborators: 3,
  },
  {
    id: "pro",
    priceUsd: 29,
    priceBrl: 149,
    credits: 10_000,
    maxCustomers: 200,
    maxCollaborators: 10,
    popular: true,
  },
  {
    id: "business",
    priceUsd: 79,
    priceBrl: 399,
    credits: 30_000,
    maxCustomers: null,
    maxCollaborators: null,
  },
];

interface PlansGridProps {
  currentPlanId: "free" | "starter" | "pro" | "business";
  currency: "usd" | "brl";
  hasStripeSub: boolean;
}

export function UsagePlansGrid({
  currentPlanId,
  currency,
  hasStripeSub,
}: PlansGridProps) {
  const { t, i18n } = useTranslation();
  const createSubscriptionCheckout = useAction(
    api.billing.stripe.createSubscriptionCheckout,
  );
  const changePlan = useAction(api.billing.stripeNode.changePlan);
  const [loadingPlan, setLoadingPlan] = useState<PaidPlanId | null>(null);

  const locale = i18n.language.startsWith("pt") ? "pt-BR" : "en-US";
  const currencyCode = currency === "brl" ? "BRL" : "USD";
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  });

  const currentOrder = ["free", "starter", "pro", "business"].indexOf(
    currentPlanId,
  );

  const handleSelect = async (planId: PaidPlanId) => {
    setLoadingPlan(planId);
    try {
      if (!hasStripeSub) {
        const { url } = await createSubscriptionCheckout({ planId, currency });
        if (url) {
          window.location.href = url;
          return;
        }
        toast.error(t("errors.generationFailed"));
        return;
      }

      // Already subscribed — change plan. The webhook will sync userPlans
      // asynchronously; the reactive Convex query auto-refreshes the UI when
      // it lands. Meanwhile, show a "processing" toast so the user knows the
      // request was accepted but the plan card may take a moment to update.
      const result = await changePlan({ targetPlanId: planId, currency });
      if (result.status === "scheduled") {
        toast.info(t("billing.changeScheduledTitle"), {
          description: t("billing.changeScheduledMessage"),
        });
      } else if (result.status === "upgraded") {
        toast.success(t("billing.changeProcessingTitle"), {
          description: t("billing.changeProcessingMessage"),
        });
      }
    } catch (err) {
      console.error("changePlan error:", err);
      toast.error(t("errors.generationFailed"));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">
          {t("billing.plans.sectionTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("billing.plans.sectionDescription")}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PAID_PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const planOrder = ["free", "starter", "pro", "business"].indexOf(
            plan.id,
          );
          const isUpgrade = planOrder > currentOrder;
          const price = currency === "brl" ? plan.priceBrl : plan.priceUsd;

          return (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t(`billing.plans.${plan.id}.name`)}</CardTitle>
                  {plan.popular && (
                    <Badge variant="default">
                      {t("landing.pricing.mostPopular")}
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge variant="outline">
                      {t("billing.currentPlan")}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {t(`billing.plans.${plan.id}.description`)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tabular-nums">
                    {formatter.format(price)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t("landing.pricing.monthSuffix")}
                  </span>
                </div>
                <ul className="flex flex-col gap-2 text-sm">
                  <li className="text-muted-foreground">
                    {formatNumber(plan.credits)} {t("labels.credits")}
                  </li>
                  {plan.maxCustomers !== null && (
                    <li className="text-muted-foreground">
                      {plan.maxCustomers} {t("labels.customers")}
                    </li>
                  )}
                  {plan.maxCollaborators !== null && (
                    <li className="text-muted-foreground">
                      {plan.maxCollaborators} {t("labels.collaborators")}
                    </li>
                  )}
                </ul>
                <Button
                  variant={isCurrent ? "outline" : "default"}
                  disabled={isCurrent || loadingPlan !== null}
                  onClick={() => handleSelect(plan.id)}
                >
                  {loadingPlan === plan.id ? (
                    <Spinner />
                  ) : isCurrent ? (
                    t("billing.currentPlan")
                  ) : hasStripeSub ? (
                    isUpgrade
                      ? t("billing.upgrade")
                      : t("billing.downgrade")
                  ) : (
                    t("billing.subscribe")
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
