import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useTopBarActions } from "@/components/layout/top-bar-actions-context";
import { useIsMobile } from "@/hooks/use-mobile";
import useNavigationStore from "@/stores/navigation";
import useCustomerSelectionStore from "@/stores/customer-selection";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AgentFilterList } from "./agent-filter-list";
import { AgentDialog, type AgentData } from "./agent-dialog";
import { AgentChatDialog } from "./agent-chat-dialog";
import { AgentItem } from "./agent-item";
import { CustomerSelector } from "@/components/chat/customer-selector";
import { EmptyState } from "@/components/ui/custom/empty-state";
import { AnimatedList } from "@/components/ui/custom/animated-list";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { Bot, Plus, Filter, X } from "lucide-react";
import Spinner from "@/components/ui/custom/spinner";

export type AgentFilter = "scheduled" | "running" | "completed";

export function AgentsLayout() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { setTopBarActions } = useTopBarActions()!;
  const isActive = useNavigationStore((s) => s.activePage === "agents");

  const [activeFilter, setActiveFilter] = useState<AgentFilter>("scheduled");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { selectedCustomerId, setSelectedCustomerId } = useCustomerSelectionStore();

  const customerFilter = selectedCustomerId ? { customerId: selectedCustomerId } : {};

  // Scheduled tasks
  const tasks = useQuery(api.agents.queries.listScheduledTasks, customerFilter);
  const runsCount = useQuery(api.agents.queries.countTaskRuns, customerFilter);
  const runningCount = useQuery(api.agents.queries.countRunningTaskRuns, customerFilter);
  const deleteTaskMutation = useMutation(api.agents.mutations.deleteScheduledTask);

  // Running tasks
  const {
    results: runningResults,
    status: runningStatus,
    loadMore: loadMoreRunning,
  } = usePaginatedQuery(
    api.agents.queries.listRunningTaskRuns,
    { customerId: selectedCustomerId ?? undefined },
    { initialNumItems: 20 },
  );
  const runningSentinelRef = useInfiniteScroll(loadMoreRunning, runningStatus);

  // Completed tasks
  const {
    results: completedResults,
    status: completedStatus,
    loadMore: loadMoreCompleted,
  } = usePaginatedQuery(
    api.agents.queries.listTaskRuns,
    { customerId: selectedCustomerId ?? undefined },
    { initialNumItems: 20 },
  );
  const completedSentinelRef = useInfiniteScroll(loadMoreCompleted, completedStatus);

  // Auto-load when filtering leaves page empty
  useEffect(() => {
    if (activeFilter === "running" && runningResults.length === 0 && runningStatus === "CanLoadMore") {
      loadMoreRunning(20);
    }
  }, [activeFilter, runningResults.length, runningStatus, loadMoreRunning]);

  useEffect(() => {
    if (activeFilter === "completed" && completedResults.length === 0 && completedStatus === "CanLoadMore") {
      loadMoreCompleted(20);
    }
  }, [activeFilter, completedResults.length, completedStatus, loadMoreCompleted]);

  // Create/edit dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AgentData | null>(null);

  // Delete dialog
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"scheduledTasks"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  // Chat dialog
  const [chatThreadId, setChatThreadId] = useState<Id<"threads"> | null>(null);

  // Counts
  const counts = useMemo(() => {
    return {
      scheduled: tasks?.length ?? 0,
      running: runningCount ?? 0,
      completed: runsCount ?? 0,
    };
  }, [tasks, runningCount, runsCount]);

  const handleNewTask = useCallback(() => {
    setEditTarget(null);
    setIsDialogOpen(true);
    if (isMobile) setIsFilterOpen(false);
  }, [isMobile]);

  const handleEditRequest = useCallback(
    (taskId: Id<"scheduledTasks">) => {
      const task = tasks?.find((t) => t._id === taskId);
      if (!task) return;
      setEditTarget({
        _id: task._id,
        title: task.title,
        prompt: task.prompt,
        repeatType: task.repeatType,
        scheduledDate: task.scheduledDate,
        scheduledTime: task.scheduledTime,
        weekDay: task.weekDay,
        monthDay: task.monthDay,
        expirationDate: task.expirationDate,
        customerId: task.customerId,
        autoSendMessages: task.autoSendMessages,
      });
      setIsDialogOpen(true);
    },
    [tasks],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTargetId) return;
    setDeleteError(false);
    setIsDeleting(true);
    try {
      await deleteTaskMutation({ taskId: deleteTargetId });
      setDeleteTargetId(null);
    } catch {
      setDeleteError(true);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTargetId, deleteTaskMutation]);

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
        <Button onClick={handleNewTask} size="icon">
          <Plus className="size-4.5" />
        </Button>
      </>,
    );
  }, [isActive, isMobile, handleNewTask, setTopBarActions]);

  const isLoadingRunning = runningStatus === "LoadingFirstPage" || (runningResults.length === 0 && runningStatus === "CanLoadMore");
  const isLoadingCompleted = completedStatus === "LoadingFirstPage" || (completedResults.length === 0 && completedStatus === "CanLoadMore");

  return (
    <>
      <main className="flex flex-1 flex-col overflow-hidden min-h-0">
        <div className="flex flex-1 gap-0 overflow-hidden min-h-0">
          {/* Filter sidebar — desktop only */}
          <div className="hidden md:flex w-72 shrink-0 h-full">
            <div className="h-full w-full flex flex-col bg-transparent rounded-none p-0 ring-0 border-r">
              <CardContent className="flex-1 min-h-0 overflow-hidden flex flex-col p-0">
                <div className="shrink-0 px-4 pt-4 pb-2">
                  <h2 className="text-base font-medium text-foreground">{t("labels.agents")}</h2>
                </div>
                <div className="shrink-0 px-4 pb-4 space-y-2">
                  <CustomerSelector
                    selectedCustomerId={selectedCustomerId}
                    onSelect={setSelectedCustomerId}
                  />
                  <Button
                    variant="default"
                    onClick={handleNewTask}
                    className="w-full justify-center"
                  >
                    {t("actions.newAgent")}
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 pt-2">
                  <AnimatedList className="space-y-2 pt-2" itemCount={3} visible={isActive}>
                    <AgentFilterList
                      activeFilter={activeFilter}
                      onSelectFilter={setActiveFilter}
                      counts={counts}
                    />
                  </AnimatedList>
                </div>
              </CardContent>
            </div>
          </div>

          {/* Main area */}
          <div className="flex flex-1 flex-col min-h-0 overflow-y-auto p-4">
            {/* Scheduled */}
            {activeFilter === "scheduled" && (
              <>
                {tasks === undefined ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Spinner />
                  </div>
                ) : tasks.length === 0 ? (
                  <EmptyState icon={Bot} message={t("empty.noAgents")} />
                ) : (
                  <AnimatedList
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    itemCount={tasks.length}
                    dataKey={selectedCustomerId}
                    visible={isActive}
                  >
                    {tasks.map((task) => (
                      <AgentItem
                        key={task._id}
                        type="scheduled"
                        task={task}
                        onEdit={handleEditRequest}
                        onDelete={setDeleteTargetId}
                      />
                    ))}
                  </AnimatedList>
                )}
              </>
            )}

            {/* Running */}
            {activeFilter === "running" && (
              <>
                {isLoadingRunning ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Spinner />
                  </div>
                ) : runningResults.length === 0 ? (
                  <EmptyState icon={Bot} message={t("empty.noRunningTasks")} />
                ) : (
                  <AnimatedList
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    itemCount={runningResults.length}
                    dataKey={`running-${selectedCustomerId}`}
                    visible={isActive}
                  >
                    {runningResults.map((run) => (
                      <AgentItem
                        key={run._id}
                        type="running"
                        run={run}
                        onViewConversation={setChatThreadId}
                      />
                    ))}
                    <div ref={runningSentinelRef} className="h-1" />
                  </AnimatedList>
                )}
              </>
            )}

            {/* Completed */}
            {activeFilter === "completed" && (
              <>
                {isLoadingCompleted ? (
                  <div className="flex flex-1 items-center justify-center">
                    <Spinner />
                  </div>
                ) : completedResults.length === 0 ? (
                  <EmptyState icon={Bot} message={t("empty.noTaskRuns")} />
                ) : (
                  <AnimatedList
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    itemCount={completedResults.length}
                    dataKey={`completed-${selectedCustomerId}`}
                    visible={isActive}
                  >
                    {completedResults.map((run) => (
                      <AgentItem
                        key={run._id}
                        type="completed"
                        run={run}
                        onViewConversation={setChatThreadId}
                      />
                    ))}
                    <div ref={completedSentinelRef} className="h-1" />
                  </AnimatedList>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Create/edit dialog */}
      <AgentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editTask={editTarget}
        presetCustomerId={selectedCustomerId ?? undefined}
      />

      {/* Chat dialog */}
      <AgentChatDialog
        threadId={chatThreadId}
        onOpenChange={(open) => { if (!open) setChatThreadId(null); }}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open: boolean) => {
          if (isDeleting) return;
          if (!open) {
            setDeleteTargetId(null);
            setDeleteError(false);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("alerts.deleteAgent")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError
                ? t("errors.deleteAgentFailed")
                : t("alerts.confirmDeleteAgent")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost" disabled={isDeleting}>
              {t("actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="default"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Spinner size={5} /> : t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filter drawer — mobile only */}
      {isMobile && (
        <Drawer direction="right" open={isFilterOpen} onOpenChange={setIsFilterOpen} handleOnly={true}>
          <DrawerContent className="p-4 border-0 shadow-none bg-transparent border-l-0">
            <div className="flex flex-col h-full p-4 border rounded-xl bg-card shadow-xl">
              <div className="shrink-0 flex items-center justify-between mb-4">
                <span className="font-heading text-base font-medium">{t("labels.agents")}</span>
                <DrawerClose render={<Button variant="ghost" size="icon" />}>
                  <X className="size-4.5" />
                </DrawerClose>
              </div>
              <div className="shrink-0 mb-4">
                <CustomerSelector
                  selectedCustomerId={selectedCustomerId}
                  onSelect={setSelectedCustomerId}
                />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <AnimatedList className="space-y-2 w-full" itemCount={3} visible={isActive}>
                  <AgentFilterList
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
