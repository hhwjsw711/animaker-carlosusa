import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTopBarActions } from "@/components/layout/top-bar-actions-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSkillActions } from "@/hooks/use-skill-actions";
import useNavigationStore from "@/stores/navigation";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
} from "@/components/ui/drawer";
import { SkillFilterList } from "./skill-filter-list";
import { SkillCard } from "./skill-card";
import { SkillDialog } from "./skill-dialog";
import { SkillDeleteDialog } from "./skill-delete-dialog";
import { SquareLibrary, Plus, Search, X, Filter } from "lucide-react";
import Spinner from "@/components/ui/custom/spinner";
import { AnimatedList } from "@/components/ui/custom/animated-list";
import { EmptyState } from "@/components/ui/custom/empty-state";

export function SkillsLayout() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { setTopBarActions } = useTopBarActions()!;
  const isActive = useNavigationStore((s) => s.activePage === "skills");

  const {
    skills,
    isDialogOpen,
    setIsDialogOpen,
    editTarget,
    handleNewSkill,
    handleEditRequest,
    deleteTargetId,
    isDeleting,
    deleteError,
    handleDeleteRequest,
    confirmDelete,
    dismissDelete,
  } = useSkillActions();

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Category counts — user skills count in their real category AND in "user"
  const counts = useMemo(() => {
    if (!skills) return {};
    const map: Record<string, number> = {};
    for (const s of skills) {
      map[s.category] = (map[s.category] ?? 0) + 1;
      if (s.type === "user") {
        map["user"] = (map["user"] ?? 0) + 1;
      }
    }
    return map;
  }, [skills]);

  // Filtered skills
  const filteredSkills = useMemo(() => {
    if (!skills) return undefined;
    let result = skills;

    if (activeFilter === "user") {
      result = result.filter((s) => s.type === "user");
    } else if (activeFilter) {
      result = result.filter((s) => s.category === activeFilter);
    }

    const trimmed = searchQuery.trim().toLowerCase();
    if (trimmed) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(trimmed) ||
          s.description.toLowerCase().includes(trimmed),
      );
    }
    return result;
  }, [skills, activeFilter, searchQuery]);

  const onNewSkill = useCallback(() => {
    handleNewSkill();
    if (isMobile) setIsFilterOpen(false);
  }, [handleNewSkill, isMobile]);

  // Mobile top bar actions
  useEffect(() => {
    if (!isActive) return;
    if (!isMobile) {
      setTopBarActions(null);
      return;
    }
    setTopBarActions(
      <>
        <Button variant="ghost" size="icon" onClick={() => setIsFilterOpen(true)}>
          <Filter className="size-4.5" />
        </Button>
        <Button onClick={onNewSkill} size="icon">
          <Plus className="size-4.5" />
        </Button>
      </>,
    );
  }, [isActive, isMobile, setTopBarActions, onNewSkill]);

  return (
    <>
      <main className="flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="flex flex-1 gap-0 overflow-hidden min-h-0">
          {/* Filter sidebar — desktop only */}
          <div className="hidden md:flex w-72 shrink-0 h-full">
            <div className="h-full w-full flex flex-col bg-transparent rounded-none p-0 ring-0 border-r">
              <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col p-0">
                <div className="shrink-0 px-4 pt-4 pb-2">
                  <h2 className="text-base font-medium text-foreground">{t("labels.skills")}</h2>
                </div>
                <div className="shrink-0 px-4 pb-4 space-y-2">
                  <div className="relative">
                    <Search className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("labels.searchSkills")}
                      className="pl-9!"
                    />
                  </div>
                  <Button
                    variant="default"
                    onClick={onNewSkill}
                    className="w-full justify-center"
                  >
                    {t("actions.newSkill")}
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 pt-2">
                  <AnimatedList className="space-y-2 pt-2" itemCount={Object.keys(counts).length + 1} visible={isActive}>
                    <SkillFilterList
                      activeFilter={activeFilter}
                      onSelectFilter={setActiveFilter}
                      counts={counts}
                    />
                  </AnimatedList>
                </div>
              </CardContent>
            </div>
          </div>

          {/* Main area — cards grid */}
          <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
            {filteredSkills === undefined ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner />
              </div>
            ) : filteredSkills.length === 0 ? (
              <EmptyState icon={SquareLibrary} message={t("empty.noSkillsFound")} />
            ) : (
              <div className="p-4 space-y-4">
                <AnimatedList className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4" itemCount={filteredSkills.length} dataKey={activeFilter} visible={isActive}>
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
                </AnimatedList>
              </div>
            )}
          </div>
        </div>
      </main>

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

      {/* Filter drawer — mobile only */}
      {isMobile && (
        <Drawer direction="right" open={isFilterOpen} onOpenChange={setIsFilterOpen} handleOnly={true}>
          <DrawerContent className="p-4 border-0 shadow-none bg-transparent border-l-0">
            <div className="flex flex-col h-full p-4 border rounded-xl bg-card shadow-xl">
              <div className="shrink-0 flex items-center justify-between mb-4">
                <span className="font-heading text-base font-medium">{t("labels.skills")}</span>
                <DrawerClose render={<Button variant="ghost" size="icon" />}>
                  <X className="size-4.5" />
                </DrawerClose>
              </div>
              <div className="relative mb-4">
                <Search className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("labels.searchSkills")}
                  className="pl-9!"
                />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AnimatedList className="space-y-2 w-full" itemCount={Object.keys(counts).length + 1} visible={isActive}>
                  <SkillFilterList
                    activeFilter={activeFilter}
                    onSelectFilter={(filter) => {
                      setActiveFilter(filter);
                      setIsFilterOpen(false);
                    }}
                    counts={counts}
                  />
                </AnimatedList>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
