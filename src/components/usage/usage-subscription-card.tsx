import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAction } from "convex/react";
import { toast } from "sonner";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Spinner from "@/components/ui/custom/spinner";
import { api } from "../../../convex/_generated/api";

type PlanId = "free" | "starter" | "pro" | "business";
type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

interface SubscriptionCardProps {
  subscription: {
    planId: PlanId;
    status: SubscriptionStatus;
    currentPeriodEnd: number | null;
    cancelAtPeriodEnd: boolean;
    stripeSubscriptionId: string | null;
  } | null;
}

const STATUS_VARIANT: Record<
  SubscriptionStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  active: "default",
  trialing: "default",
  past_due: "destructive",
  canceled: "outline",
  unpaid: "destructive",
  incomplete: "outline",
  incomplete_expired: "outline",
  paused: "outline",
};

const STATUS_I18N: Record<SubscriptionStatus, string> = {
  active: "billing.status.active",
  trialing: "billing.status.trialing",
  past_due: "billing.status.pastDue",
  canceled: "billing.status.canceled",
  unpaid: "billing.status.unpaid",
  incomplete: "billing.status.incomplete",
  incomplete_expired: "billing.status.incomplete",
  paused: "billing.status.paused",
};

export function UsageSubscriptionCard({ subscription }: SubscriptionCardProps) {
  const { t, i18n } = useTranslation();
  const openPortal = useAction(
    api.billing.stripe.createCustomerPortalSession,
  );
  const [loadingPortal, setLoadingPortal] = useState(false);

  const planId = subscription?.planId ?? "free";
  const status = subscription?.status ?? "active";
  const periodEnd = subscription?.currentPeriodEnd;
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd ?? false;
  const hasStripeSub = !!subscription?.stripeSubscriptionId;

  const handleOpenPortal = async () => {
    setLoadingPortal(true);
    try {
      const { url } = await openPortal({});
      window.location.href = url;
    } catch {
      toast.error(t("errors.generationFailed"));
      setLoadingPortal(false);
    }
  };

  const periodEndLabel = periodEnd
    ? new Date(periodEnd * 1000).toLocaleDateString(i18n.language, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("billing.currentPlan")}</CardTitle>
        <CardAction>
          <Badge variant={STATUS_VARIANT[status]}>
            {t(STATUS_I18N[status])}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            {t(`billing.plans.${planId}.name`)}
          </span>
        </div>

        {periodEndLabel && hasStripeSub && (
          <div className="text-sm text-muted-foreground">
            {cancelAtPeriodEnd
              ? `${t("billing.cancelsOn")}: ${periodEndLabel}`
              : `${t("billing.nextBilling")}: ${periodEndLabel}`}
          </div>
        )}

        {hasStripeSub && (
          <Button
            variant="outline"
            onClick={handleOpenPortal}
            disabled={loadingPortal}
          >
            {loadingPortal ? <Spinner /> : t("billing.manage")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
