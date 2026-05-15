import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSkillActions } from "@/hooks/use-skill-actions";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/custom/spinner";
import { EmptyState } from "@/components/ui/custom/empty-state";
import { SkillCard } from "@/components/skills/skill-card";
import { SkillDialog } from "@/components/skills/skill-dialog";
import { SkillDeleteDialog } from "@/components/skills/skill-delete-dialog";
import { Input } from "@/components/ui/input";
import { SquareLibrary, X, Search } from "lucide-react";

export function SkillPopover() {
  const { t } = useTranslation();

  const {
    skills,
    isDialogOpen,
    setIsDialogOpen,
    editTarget,
    handleEditRequest,
    deleteTargetId,
    isDeleting,
    deleteError,
    handleDeleteRequest,
    confirmDelete,
    dismissDelete,
  } = useSkillActions();

  const enabledCount = skills?.filter((s) => s.enabled).length ?? 0;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSkills = useMemo(() => {
    if (!skills) return undefined;
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return skills;
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(trimmed) ||
        s.description.toLowerCase().includes(trimmed),
    );
  }, [skills, searchQuery]);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="relative size-8"
              onClick={() => setIsOpen(true)}
            />
          }
        >
          <SquareLibrary className="size-4.5" />
          {enabledCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {enabledCount}
            </span>
          )}
        </TooltipTrigger>
        <TooltipContent side="top">{t("labels.skills")}</TooltipContent>
      </Tooltip>

      <Drawer direction="right" open={isOpen} onOpenChange={setIsOpen} handleOnly={true}>
        <DrawerContent className="p-4 border-0 shadow-none bg-transparent border-l-0">
          <div className="flex flex-col h-full p-4 border rounded-xl bg-card shadow-xl">
            <div className="shrink-0 flex items-center justify-between mb-4">
              <span className="font-heading text-base font-medium">
                {t("labels.skills")}
              </span>
              <DrawerClose render={<Button variant="ghost" size="icon" />}>
                <X className="size-4.5" />
              </DrawerClose>
            </div>

            <div className="relative shrink-0 mb-4">
              <Search className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("labels.searchSkills")}
                className="pl-9!"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {filteredSkills === undefined ? (
                <div className="flex flex-1 items-center justify-center">
                  <Spinner />
                </div>
              ) : filteredSkills.length === 0 ? (
                <EmptyState icon={SquareLibrary} message={t("empty.noSkillsFound")} />
              ) : (
                <div className="flex flex-col gap-4 p-1">
                  {filteredSkills.map((skill) => (
                    <SkillCard
                      key={skill._id}
                      skillId={skill._id}
                      name={skill.name}
                      description={skill.description}
                      category={skill.category}
                      type={skill.type}
                      enabled={skill.enabled}
                      onEditRequest={handleEditRequest}
                      onDeleteRequest={handleDeleteRequest}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <SkillDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editSkill={editTarget}
      />

      <SkillDeleteDialog
        open={!!deleteTargetId}
        onOpenChange={dismissDelete}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        hasError={deleteError}
      />
    </>
  );
}
