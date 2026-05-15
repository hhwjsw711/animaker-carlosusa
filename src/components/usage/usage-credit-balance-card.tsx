import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { formatNumber } from "./usage-helpers";

interface CreditBalanceCardProps {
  balance: { daily: number; monthly: number; addOn: number; total: number };
  planLimits: {
    planId: string;
    monthlyCredits: number;
    dailyCredits: number;
  };
}

export function UsageCreditBalanceCard({ balance, planLimits }: CreditBalanceCardProps) {
  const { t } = useTranslation();

  const monthlyPercent = planLimits.monthlyCredits > 0
    ? Math.round((balance.monthly / planLimits.monthlyCredits) * 100)
    : 0;

  const dailyPercent = planLimits.dailyCredits > 0
    ? Math.round((balance.daily / planLimits.dailyCredits) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("labels.creditBalance")}</CardTitle>
        <CardAction>
          <Badge variant="outline">{t("labels.plan")}: {planLimits.planId}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">{formatNumber(balance.total)}</span>
          <span className="text-sm text-muted-foreground">{t("labels.credits")}</span>
        </div>

        <div className="flex flex-col gap-4">
          <Progress value={monthlyPercent} max={100}>
            <ProgressLabel>{t("labels.monthlyCredits")}</ProgressLabel>
            <ProgressValue>
              {formatNumber(balance.monthly)} / {formatNumber(planLimits.monthlyCredits)}
            </ProgressValue>
          </Progress>

          {planLimits.dailyCredits > 0 && (
            <Progress value={dailyPercent} max={100}>
              <ProgressLabel>{t("labels.dailyCredits")}</ProgressLabel>
              <ProgressValue>
                {formatNumber(balance.daily)} / {formatNumber(planLimits.dailyCredits)}
              </ProgressValue>
            </Progress>
          )}

          {balance.addOn > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t("labels.addOnCredits")}</span>
              <span className="text-muted-foreground tabular-nums">{formatNumber(balance.addOn)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
