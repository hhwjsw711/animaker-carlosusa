import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  SOURCE_KEYS,
  SOURCE_COLORS,
  SOURCE_LABEL_KEYS,
  formatNumber,
  type SourceKey,
  type UsageHistoryRow,
} from "./usage-helpers";

interface SourceBreakdownCardProps {
  usageHistory: UsageHistoryRow[] | null | undefined;
}

export function UsageSourceBreakdownCard({ usageHistory }: SourceBreakdownCardProps) {
  const { t } = useTranslation();

  const breakdown = useMemo(() => {
    const totals: Record<SourceKey, number> = {
      chat: 0,
      scheduled: 0,
      extraction: 0,
      rag: 0,
      exa: 0,
      imageGeneration: 0,
    };

    if (!usageHistory?.length) return { totals, grand: 0 };

    for (const day of usageHistory) {
      for (const key of SOURCE_KEYS) {
        totals[key] += day[key].credits;
      }
    }

    const grand = SOURCE_KEYS.reduce((sum, k) => sum + totals[k], 0);
    return { totals, grand };
  }, [usageHistory]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("labels.usageBySource")}</CardTitle>
        <CardDescription>{t("labels.last30Days")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {breakdown.grand === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty.noUsageHistory")}</p>
        ) : (
          SOURCE_KEYS.map((key) => {
            const value = breakdown.totals[key];
            const percent = breakdown.grand > 0 ? Math.round((value / breakdown.grand) * 100) : 0;

            return (
              <div key={key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t(SOURCE_LABEL_KEYS[key])}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatNumber(value)} ({percent}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: SOURCE_COLORS[key],
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
