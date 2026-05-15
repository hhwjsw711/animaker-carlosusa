import { cn } from "@/lib/utils";
import { SKILL_CATEGORY_COLORS, SKILL_CATEGORY_KEYS, SKILL_USER_FILTER_COLOR, type SkillCategory } from "@/lib/skill-colors";
import { memo } from "react";
import { useTranslation } from "react-i18next";

interface SkillFilterListProps {
  activeFilter: string | null;
  onSelectFilter: (filter: string | null) => void;
  counts: Record<string, number>;
}

const SkillFilterListContent = memo(function SkillFilterListContent({
  activeFilter,
  onSelectFilter,
  counts,
}: SkillFilterListProps) {
  const { t } = useTranslation();

  const totalCount = Object.values(counts).reduce((sum, c) => sum + c, 0);

  return (
    <>
      {/* All */}
      <div
        onClick={() => onSelectFilter(null)}
        className={cn(
          "bg-accent/20 hover:bg-accent/40 group flex flex-row items-center rounded-lg p-2 py-1 pr-3 gap-2 cursor-pointer",
          activeFilter === null && "bg-accent hover:bg-accent",
        )}
      >
        <div className="w-1 rounded-full h-8 bg-muted-foreground" />
        <div className="flex-1 flex flex-col truncate min-w-0">
          <span className="truncate text-foreground">{t("labels.all")}</span>
          <span className="truncate text-xs text-muted-foreground">
            {totalCount} {t("labels.skills").toLowerCase()}
          </span>
        </div>
      </div>

      {/* Categories */}
      {SKILL_CATEGORY_KEYS.map((category) => {
        const colorClass = SKILL_CATEGORY_COLORS[category];
        const count = counts[category] ?? 0;

        return (
          <div
            key={category}
            onClick={() => onSelectFilter(activeFilter === category ? null : category)}
            className={cn(
              "bg-accent/20 hover:bg-accent/40 group flex flex-row items-center rounded-lg p-2 py-1 pr-3 gap-2 cursor-pointer",
              activeFilter === category && "bg-accent hover:bg-accent",
            )}
          >
            <div className={`w-1 rounded-full h-8 ${colorClass}`} />
            <div className="flex-1 flex flex-col truncate min-w-0">
              <span className="truncate text-foreground">
                {t(`labels.${category}` as never)}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {count} {t("labels.skills").toLowerCase()}
              </span>
            </div>
          </div>
        );
      })}

      {/* My skills */}
      <div
        onClick={() => onSelectFilter(activeFilter === "user" ? null : "user")}
        className={cn(
          "bg-accent/20 hover:bg-accent/40 group flex flex-row items-center rounded-lg p-2 py-1 pr-3 gap-2 cursor-pointer",
          activeFilter === "user" && "bg-accent hover:bg-accent",
        )}
      >
        <div className={`w-1 rounded-full h-8 ${SKILL_USER_FILTER_COLOR}`} />
        <div className="flex-1 flex flex-col truncate min-w-0">
          <span className="truncate text-foreground">{t("labels.mySkills")}</span>
          <span className="truncate text-xs text-muted-foreground">
            {counts["user"] ?? 0} {t("labels.skills").toLowerCase()}
          </span>
        </div>
      </div>
    </>
  );
});

export const SkillFilterList = SkillFilterListContent;
