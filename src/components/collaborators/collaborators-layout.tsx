import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useTopBarActions } from "@/components/layout/top-bar-actions-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import useNavigationStore from "@/stores/navigation";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollaboratorCard } from "./collaborator-card";
import { CollaboratorRoleList } from "./collaborator-role-list";
import { CollaboratorDialog } from "./collaborator-dialog";
import { CollaboratorDeleteDialog } from "./collaborator-delete-dialog";
import { ContactRound, Plus, Search } from "lucide-react";
import Spinner from "@/components/ui/custom/spinner";
import { AnimatedList } from "@/components/ui/custom/animated-list";
import { EmptyState } from "@/components/ui/custom/empty-state";

export function CollaboratorsLayout() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { setTopBarActions } = useTopBarActions()!;
  const isActive = useNavigationStore((s) => s.activePage === "collaborators");

  const {
    results: collaborators,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(api.collaborators.queries.listCollaborators, {}, { initialNumItems: 50 });

  const sentinelRef = useInfiniteScroll(loadMore, paginationStatus);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    _id: Id<"collaborators">;
    name: string;
    email: string;
    phone?: string;
    role: "admin" | "staff";
    status: "active" | "inactive";
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Id<"collaborators"> | null>(null);

  const counts = useMemo(() => {
    const map: Record<string, number> = { admin: 0, staff: 0 };
    for (const c of collaborators) {
      map[c.role] = (map[c.role] ?? 0) + 1;
    }
    return map;
  }, [collaborators]);

  const filteredCollaborators = useMemo(() => {
    if (paginationStatus === "LoadingFirstPage") return undefined;

    let result = collaborators;

    if (activeFilter) {
      result = result.filter((c) => c.role === activeFilter);
    }

    const trimmed = searchQuery.trim().toLowerCase();
    if (trimmed) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(trimmed) ||
          c.email.toLowerCase().includes(trimmed),
      );
    }

    return result;
  }, [collaborators, activeFilter, searchQuery, paginationStatus]);

  const handleNew = useCallback(() => {
    setEditTarget(null);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback(
    (id: Id<"collaborators">) => {
      const collab = collaborators.find((c) => c._id === id);
      if (!collab) return;
      setEditTarget({
        _id: collab._id,
        name: collab.name,
        email: collab.email,
        phone: collab.phone,
        role: collab.role,
        status: collab.status,
      });
      setIsDialogOpen(true);
    },
    [collaborators],
  );

  const handleDelete = useCallback((id: Id<"collaborators">) => {
    setDeleteTarget(id);
  }, []);

  // Mobile top bar actions
  useEffect(() => {
    if (!isActive) return;
    if (!isMobile) {
      setTopBarActions(null);
      return;
    }
    setTopBarActions(
      <Button size="icon" onClick={handleNew}>
        <Plus className="size-4.5" />
      </Button>,
    );
  }, [isActive, isMobile, setTopBarActions, handleNew]);

  return (
    <>
      <main className="flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="flex flex-1 gap-0 overflow-hidden min-h-0">
          {/* Filter sidebar — desktop only */}
          <div className="hidden md:flex w-72 shrink-0 h-full">
            <div className="h-full w-full flex flex-col bg-transparent rounded-none p-0 ring-0 border-r">
              <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col p-0">
                <div className="shrink-0 px-4 pt-4 pb-2">
                  <h2 className="text-base font-medium text-foreground">{t("labels.collaborators")}</h2>
                </div>
                <div className="shrink-0 px-4 pb-4 space-y-2">
                  <div className="relative">
                    <Search className="size-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("labels.searchCollaborators")}
                      className="pl-9!"
                    />
                  </div>
                  <Button
                    variant="default"
                    onClick={handleNew}
                    className="w-full justify-center"
                  >
                    {t("actions.newCollaborator")}
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 pt-2">
                  <AnimatedList className="space-y-2 pt-2" itemCount={3} visible={isActive}>
                    <CollaboratorRoleList
                      activeFilter={activeFilter}
                      onSelectFilter={setActiveFilter}
                      counts={counts}
                      totalCount={collaborators.length}
                    />
                  </AnimatedList>
                </div>
              </CardContent>
            </div>
          </div>

          {/* Main area — cards grid */}
          <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
            {filteredCollaborators === undefined ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner />
              </div>
            ) : filteredCollaborators.length === 0 ? (
              <EmptyState
                icon={ContactRound}
                message={searchQuery || activeFilter ? t("empty.noCollaboratorsFound") : t("empty.noCollaborators")}
              />
            ) : (
              <div className="p-4 space-y-4">
                <AnimatedList
                  className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"
                  itemCount={filteredCollaborators.length}
                  dataKey={activeFilter}
                  visible={isActive}
                >
                  {filteredCollaborators.map((collab) => (
                    <CollaboratorCard
                      key={collab._id}
                      collaborator={collab}
                      onEditRequest={handleEdit}
                      onDeleteRequest={handleDelete}
                    />
                  ))}
                </AnimatedList>
                <div ref={sentinelRef} />
              </div>
            )}
          </div>
        </div>
      </main>

      <CollaboratorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editCollaborator={editTarget}
      />

      <CollaboratorDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        collaboratorId={deleteTarget}
      />
    </>
  );
}
