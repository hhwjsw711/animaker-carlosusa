import { cn } from "@/lib/utils";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { ROLE_COLOR_CLASSES } from "@/lib/collaborator-roles";

interface CollaboratorRoleListProps {
  activeFilter: string | null;
  onSelectFilter: (filter: string | null) => void;
  counts: Record<string, number>;
  totalCount: number;
}

export const CollaboratorRoleList = memo(function CollaboratorRoleList({
  activeFilter,
  onSelectFilter,
  counts,
  totalCount,
}: CollaboratorRoleListProps) {
  const { t } = useTranslation();

  const roles = [
    { key: "admin", label: t("labels.roleAdmin"), color: ROLE_COLOR_CLASSES.admin },
    { key: "staff", label: t("labels.roleStaff"), color: ROLE_COLOR_CLASSES.staff },
  ];

  return (
    <>
      {/* All */}
      <div
        onClick={() => onSelectFilter(null)}
        className={cn(
          "bg-accent/20 hover:bg-accent/40 group flex flex-row items-center rounded-lg p-2 py-1 gap-2 cursor-pointer",
          activeFilter === null && "bg-accent hover:bg-accent",
        )}
      >
        <div className="w-1 rounded-full h-8 bg-muted-foreground" />
        <div className="flex-1 flex flex-col truncate min-w-0">
          <span className="truncate text-foreground">{t("labels.all")}</span>
          <span className="truncate text-xs text-muted-foreground">
            {totalCount} {t("labels.collaborators").toLowerCase()}
          </span>
        </div>
      </div>

      {/* Roles */}
      {roles.map((role) => {
        const count = counts[role.key] ?? 0;

        return (
          <div
            key={role.key}
            onClick={() =>
              onSelectFilter(activeFilter === role.key ? null : role.key)
            }
            className={cn(
              "bg-accent/20 hover:bg-accent/40 group flex flex-row items-center rounded-lg p-2 py-1 gap-2 cursor-pointer",
              activeFilter === role.key && "bg-accent hover:bg-accent",
            )}
          >
            <div className={`w-1 rounded-full h-8 ${role.color}`} />
            <div className="flex-1 flex flex-col truncate min-w-0">
              <span className="truncate text-foreground">{role.label}</span>
              <span className="truncate text-xs text-muted-foreground">
                {count} {t("labels.collaborators").toLowerCase()}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
});
