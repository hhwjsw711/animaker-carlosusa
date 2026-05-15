import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LazyDropdownMenu } from "@/components/ui/lazy-dropdown-menu";
import { SKILL_CATEGORY_COLORS, SKILL_USER_FILTER_COLOR, type SkillCategory } from "@/lib/skill-colors";
import { Ellipsis } from "lucide-react";

interface SkillCardProps {
  skillId: Id<"skills">;
  name: string;
  description: string;
  category: string;
  type: "system" | "user";
  enabled: boolean;
  onEditRequest: (id: Id<"skills">) => void;
  onDeleteRequest: (id: Id<"skills">) => void;
}

export function SkillCard({
  skillId,
  name,
  description,
  category,
  type,
  enabled,
  onEditRequest,
  onDeleteRequest,
}: SkillCardProps) {
  const { t } = useTranslation();
  const toggleSkill = useMutation(api.skills.mutations.toggleSkill);
  const colorClass = SKILL_CATEGORY_COLORS[category as SkillCategory] ?? SKILL_USER_FILTER_COLOR;

  return (
    <Card size="sm" className="relative overflow-hidden">
      <CardContent className="flex flex-row gap-2 h-full">
        {/* Color bar */}
        {colorClass && (
          <div className={`w-1 rounded-full shrink-0 min-h-10 ${colorClass}`} />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col h-full justify-between">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold truncate">{name}</p>
              <p className="text-muted-foreground line-clamp-2">{description}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="size-10 min-h-10 min-w-10 flex items-center justify-center">
                <Switch
                  size="sm"
                  checked={enabled}
                  onCheckedChange={() => toggleSkill({ skillId })}
                />
              </div>
              {type === "user" && (
                <div onClick={(e) => e.stopPropagation()}>
                  <LazyDropdownMenu
                    triggerClassName="flex items-center justify-center size-10 hover:bg-accent/60 cursor-pointer outline-none rounded-md"
                    triggerContent={<Ellipsis className="size-4.5" />}
                    contentProps={{ align: "end", sideOffset: 4 }}
                  >
                    <DropdownMenuItem onClick={() => onEditRequest(skillId)}>
                      {t("actions.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDeleteRequest(skillId)}>
                      {t("actions.remove")}
                    </DropdownMenuItem>
                  </LazyDropdownMenu>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Badge variant="secondary" className="text-xs">
              {t(`labels.${category}` as never)}
            </Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {type === "user" ? t("labels.mySkills") : t("labels.systemSkills")}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
