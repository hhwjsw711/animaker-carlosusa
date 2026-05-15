import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AgentDialog, type AgentData } from "@/components/agents/agent-dialog";
import { AgentChatDialog } from "@/components/agents/agent-chat-dialog";
import { AnimatedList } from "@/components/ui/custom/animated-list";
import { EmptyState } from "@/components/ui/custom/empty-state";
import Spinner from "@/components/ui/custom/spinner";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import useNavigationStore from "@/stores/navigation";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { AgentItem } from "@/components/agents/agent-item";

interface CustomerAgentsProps {
  customerId: Id<"customers">;
}

const AGENT_VIEWS = ["scheduled", "running", "completed"] as const;
type AgentView = (typeof AGENT_VIEWS)[number];

export function CustomerAgents({ customerId }: CustomerAgentsProps) {
  const { t } = useTranslation();
  const isActive = useNavigationStore((s) => s.activePage === "customers");
  const [activeView, setActiveView] = useState<AgentView>("scheduled");

  const viewItems = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of AGENT_VIEWS) {
      map[v] = t(`labels.${v}` as const);
    }
    return map;
  }, [t]);

  // Scheduled tasks
  const tasks = useQuery(api.agents.queries.listScheduledTasks, { customerId });
  const deleteTaskMutation = useMutation(api.agents.mutations.deleteScheduledTask);

  // Running tasks
  const {
    results: runningResults,
    status: runningStatus,
    loadMore: loadMoreRunning,
  } = usePaginatedQuery(
    api.agents.queries.listRunningTaskRuns,
    { customerId },
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
    { customerId },
    { initialNumItems: 20 },
  );
  const completedSentinelRef = useInfiniteScroll(loadMoreCompleted, completedStatus);

  // Auto-load when filtering leaves page empty
  useEffect(() => {
    if (activeView === "running" && runningResults.length === 0 && runningStatus === "CanLoadMore") {
      loadMoreRunning(20);
    }
  }, [activeView, runningResults.length, runningStatus, loadMoreRunning]);

  useEffect(() => {
    if (activeView === "completed" && completedResults.length === 0 && completedStatus === "CanLoadMore") {
      loadMoreCompleted(20);
    }
  }, [activeView, completedResults.length, completedStatus, loadMoreCompleted]);

  // Scheduled dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AgentData | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"scheduledTasks"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  // Running chat dialog
  const [chatThreadId, setChatThreadId] = useState<Id<"threads"> | null>(null);

  const handleNewTask = useCallback(() => {
    setEditTarget(null);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = useCallback(
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

  const isLoadingRunning = runningStatus === "LoadingFirstPage" || (runningResults.length === 0 && runningStatus === "CanLoadMore");
  const isLoadingCompleted = completedStatus === "LoadingFirstPage" || (completedResults.length === 0 && completedStatus === "CanLoadMore");

  return (
    <>
      {/* Toolbar */}
      <div className="sticky top-12 z-9 bg-background border-b p-4 flex items-center justify-start gap-2">
        <Button onClick={handleNewTask}>
          {t("actions.newAgent")}
        </Button>
        <Select
          value={activeView}
          onValueChange={(v) => setActiveView((v ?? "scheduled") as AgentView)}
          items={viewItems}
        >
          <SelectTrigger className="w-full md:w-42">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AGENT_VIEWS.map((v) => (
              <SelectItem key={v} value={v}>
                {t(`labels.${v}` as const)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Scheduled */}
        {activeView === "scheduled" && (
          <>
            {tasks === undefined ? null : tasks.length === 0 ? (
              <EmptyState icon={Bot} message={t("empty.noAgents")} />
            ) : (
              <AnimatedList
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                itemCount={tasks.length}
                dataKey={`${customerId}-scheduled`}
                visible={isActive}
              >
                {tasks.map((task) => (
                  <AgentItem
                    key={task._id}
                    type="scheduled"
                    task={task}
                    onEdit={handleEdit}
                    onDelete={setDeleteTargetId}
                  />
                ))}
              </AnimatedList>
            )}
          </>
        )}

        {/* Running */}
        {activeView === "running" && (
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
                dataKey={`${customerId}-running`}
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
        {activeView === "completed" && (
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
                dataKey={`${customerId}-completed`}
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

      {/* Dialogs */}
      <AgentDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editTask={editTarget}
        presetCustomerId={customerId}
      />

      <AgentChatDialog
        threadId={chatThreadId}
        onOpenChange={(open) => { if (!open) setChatThreadId(null); }}
      />

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
            <AlertDialogAction variant="default" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Spinner size={5} /> : t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
