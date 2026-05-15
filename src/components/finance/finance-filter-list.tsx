import { cn } from "@/lib/utils";
import { memo } from "react";
import { useTranslation } from "react-i18next";

export type FinanceFilter = "all" | "pending" | "overdue" | "paid";

interface FinanceFilterListProps {
  activeFilter: FinanceFilter;
  onSelectFilter: (filter: FinanceFilter) => void;
  counts: Record<FinanceFilter, number>;
}

const FILTERS: { key: FinanceFilter; color: string; labelKey: string }[] = [
  { key: "all", color: "bg-muted-foreground", labelKey: "labels.all" },
  { key: "pending", color: "bg-amber-500", labelKey: "status.pending" },
  { key: "overdue", color: "bg-red-500", labelKey: "status.overdue" },
  { key: "paid", color: "bg-green-500", labelKey: "status.paid" },
];

const FinanceFilterListContent = memo(function FinanceFilterListContent({
  activeFilter,
  onSelectFilter,
  counts,
}: FinanceFilterListProps) {
  const { t } = useTranslation();

  return (
    <>
      {FILTERS.map(({ key, color, labelKey }) => (
        <div
          key={key}
          onClick={() => onSelectFilter(key)}
          className={cn(
            "bg-accent/20 hover:bg-accent/40 group flex flex-row items-center rounded-lg p-2 py-1 pr-3 gap-2 cursor-pointer",
            activeFilter === key && "bg-accent hover:bg-accent",
          )}
        >
          <div className={cn("w-1 rounded-full h-8", color)} />
          <div className="flex-1 flex flex-col truncate min-w-0">
            <span className="truncate text-foreground">{t(labelKey)}</span>
            <span className="truncate text-xs text-muted-foreground">
              {counts[key] ?? 0} {t("labels.transactions").toLowerCase()}
            </span>
          </div>
        </div>
      ))}
    </>
  );
});

export const FinanceFilterList = FinanceFilterListContent;
