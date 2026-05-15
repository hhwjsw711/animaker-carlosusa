import { cn } from "@/lib/utils";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { AgentFilter } from "./agents-layout";

interface AgentFilterListProps {
  activeFilter: AgentFilter;
  onSelectFilter: (filter: AgentFilter) => void;
  counts: Record<string, number>;
}

const AgentFilterListContent = memo(function AgentFilterListContent({
  activeFilter,
  onSelectFilter,
  counts,
}: AgentFilterListProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Scheduled */}
      <div
        onClick={() => onSelectFilter("scheduled")}
        className={cn(
          "bg-accent/20 hover:bg-accent/40 group flex flex-row items-center rounded-lg p-2 py-1 pr-3 gap-2 cursor-pointer",
          activeFilter === "scheduled" && "bg-accent hover:bg-accent",
        )}
      >
        <div className="w-1 rounded-full h-8 bg-blue-500" />
        <div className="flex-1 flex flex-col truncate min-w-0">
          <span className="truncate text-foreground">{t("labels.scheduled")}</span>
          <span className="truncate text-xs text-muted-foreground">
            {counts.scheduled ?? 0} {t("labels.agents").toLowerCase()}
          </span>
        </div>
      </div>

      {/* Running */}
      <div
        onClick={() => onSelectFilter("running")}
        className={cn(
          "bg-accent/20 hover:bg-accent/40 group flex flex-row items-center rounded-lg p-2 py-1 pr-3 gap-2 cursor-pointer",
          activeFilter === "running" && "bg-accent hover:bg-accent",
        )}
      >
        <div className="w-1 rounded-full h-8 bg-amber-500" />
        <div className="flex-1 flex flex-col truncate min-w-0">
          <span className="truncate text-foreground">{t("labels.running")}</span>
          <span className="truncate text-xs text-muted-foreground">
            {counts.running ?? 0} {t("labels.runs").toLowerCase()}
          </span>
        </div>
      </div>

      {/* Completed */}
      <div
        onClick={() => onSelectFilter("completed")}
        className={cn(
          "bg-accent/20 hover:bg-accent/40 group flex flex-row items-center rounded-lg p-2 py-1 pr-3 gap-2 cursor-pointer",
          activeFilter === "completed" && "bg-accent hover:bg-accent",
        )}
      >
        <div className="w-1 rounded-full h-8 bg-green-500" />
        <div className="flex-1 flex flex-col truncate min-w-0">
          <span className="truncate text-foreground">{t("labels.completed")}</span>
          <span className="truncate text-xs text-muted-foreground">
            {counts.completed ?? 0} {t("labels.runs").toLowerCase()}
          </span>
        </div>
      </div>
    </>
  );
});

export const AgentFilterList = AgentFilterListContent;
