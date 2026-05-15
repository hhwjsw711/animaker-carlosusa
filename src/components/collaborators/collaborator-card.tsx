import { memo } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id, Doc } from "../../../convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LazyDropdownMenu } from "@/components/ui/lazy-dropdown-menu";
import { ROLE_COLOR_CLASSES } from "@/lib/collaborator-roles";
import { Ellipsis } from "lucide-react";

interface CollaboratorCardProps {
  collaborator: Doc<"collaborators">;
  onEditRequest: (id: Id<"collaborators">) => void;
  onDeleteRequest: (id: Id<"collaborators">) => void;
}

export const CollaboratorCard = memo(function CollaboratorCard({
  collaborator,
  onEditRequest,
  onDeleteRequest,
}: CollaboratorCardProps) {
  const { t } = useTranslation();
  const updateCollaborator = useMutation(api.collaborators.mutations.updateCollaborator);

  const colorClass = ROLE_COLOR_CLASSES[collaborator.role] ?? "bg-muted-foreground";

  const handleToggleStatus = () => {
    updateCollaborator({
      collaboratorId: collaborator._id,
      status: collaborator.status === "active" ? "inactive" : "active",
    });
  };

  return (
    <Card size="sm" className="relative overflow-hidden">
      <CardContent className="flex flex-row gap-2 h-full">
        {/* Color bar */}
        <div className={`w-1 rounded-full shrink-0 min-h-10 ${colorClass}`} />

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col h-full justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate line-clamp-1">{collaborator.name}</p>
              <p className="text-muted-foreground truncate line-clamp-1">{collaborator.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div onClick={(e) => e.stopPropagation()}>
                <LazyDropdownMenu
                  triggerClassName="flex items-center justify-center size-10 hover:bg-accent/60 cursor-pointer outline-none rounded-md"
                  triggerContent={<Ellipsis className="size-4.5" />}
                  contentProps={{ align: "end", sideOffset: 4 }}
                >
                  <DropdownMenuItem onClick={() => onEditRequest(collaborator._id)}>
                    {t("actions.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleStatus}>
                    {collaborator.status === "active" ? t("status.inactive") : t("status.active")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDeleteRequest(collaborator._id)}>
                    {t("actions.delete")}
                  </DropdownMenuItem>
                </LazyDropdownMenu>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Badge variant="secondary" className="text-xs">
              {collaborator.role === "admin" ? t("labels.roleAdmin") : t("labels.roleStaff")}
            </Badge>
            {collaborator.status === "inactive" && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {t("status.inactive")}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
