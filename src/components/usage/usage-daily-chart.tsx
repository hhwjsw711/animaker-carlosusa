import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/ui/custom/empty-state";
import { BarChart3 } from "lucide-react";
import {
  SOURCE_KEYS,
  SOURCE_COLORS,
  SOURCE_LABEL_KEYS,
  type UsageHistoryRow,
} from "./usage-helpers";

interface DailyChartProps {
  usageHistory: UsageHistoryRow[] | null | undefined;
}

export function UsageDailyChart({ usageHistory }: DailyChartProps) {
  const { t } = useTranslation();

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    for (const key of SOURCE_KEYS) {
      config[key] = {
        label: t(SOURCE_LABEL_KEYS[key]),
        color: SOURCE_COLORS[key],
      };
    }
    return config;
  }, [t]);

  const chartData = useMemo(() => {
    if (!usageHistory?.length) return [];
    return usageHistory.map((day) => ({
      date: day.date,
      chat: day.chat.credits,
      scheduled: day.scheduled.credits,
      extraction: day.extraction.credits,
      rag: day.rag.credits,
      exa: day.exa.credits,
      imageGeneration: day.imageGeneration.credits,
    }));
  }, [usageHistory]);

  const hasData = chartData.some((d) => d.chat + d.scheduled + d.extraction + d.rag + d.exa + d.imageGeneration > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("labels.creditsUsed")}</CardTitle>
        <CardDescription>{t("labels.last30Days")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[250px] items-center justify-center">
            <EmptyState icon={BarChart3} message={t("empty.noUsageHistory")} />
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value: string) => {
                  const d = new Date(value + "T00:00:00");
                  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                }}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      const d = new Date(value + "T00:00:00");
                      return d.toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      });
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {SOURCE_KEYS.map((key) => (
                <Area
                  key={key}
                  dataKey={key}
                  type="monotone"
                  stackId="usage"
                  fill={`var(--color-${key})`}
                  stroke={`var(--color-${key})`}
                  fillOpacity={0.4}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
