import { useState, useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LazyDropdownMenu } from "@/components/ui/lazy-dropdown-menu";
import Spinner from "@/components/ui/custom/spinner";
import { Ellipsis } from "lucide-react";
import { toast } from "sonner";
import { formatSchedule, isTaskExpired } from "./agent-utils";
import { formatDateTime } from "@/lib/format-date";

// --- Types ---

interface ScheduledTask {
  _id: Id<"scheduledTasks">;
  title: string;
  repeatType: "none" | "daily" | "weekly" | "monthly";
  scheduledDate: number;
  scheduledTime: string;
  weekDay?: number;
  monthDay?: number;
  isActive: boolean;
  expirationDate?: number;
  autoSendMessages?: boolean;
}

interface TaskRun {
  _id: Id<"scheduledTaskRuns">;
  taskTitle: string;
  startedAt: number;
  status: string;
  threadId?: Id<"threads">;
}

type AgentItemProps =
  | {
      type: "scheduled";
      task: ScheduledTask;
      onEdit: (taskId: Id<"scheduledTasks">) => void;
      onDelete: (taskId: Id<"scheduledTasks">) => void;
    }
  | {
      type: "running";
      run: TaskRun;
      onViewConversation?: (threadId: Id<"threads">) => void;
    }
  | {
      type: "completed";
      run: TaskRun;
      onViewConversation?: (threadId: Id<"threads">) => void;
    };

// --- Status badge variants ---

const RUN_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  running: "outline",
  completed: "secondary",
  failed: "destructive",
  stopped: "outline",
};

// --- Component ---

export function AgentItem(props: AgentItemProps) {
  const { type } = props;

  const title = type === "scheduled" ? props.task.title : props.run.taskTitle;
  const subtitle =
    type === "scheduled"
      ? ScheduledSubtitle({ task: props.task })
      : formatDateTime(props.run.startedAt);

  return (
    <Card className="flex flex-col justify-between">
      <CardContent>
        <p className="font-medium truncate text-foreground">{title}</p>
        <div className="flex flex-col gap-0.5 mt-1 text-sm text-muted-foreground">
          <span>{subtitle}</span>
        </div>
      </CardContent>
      <CardFooter className="justify-between items-center">
        {type === "scheduled" ? (
          <ScheduledFooter task={props.task} onEdit={props.onEdit} onDelete={props.onDelete} />
        ) : (
          <RunFooter run={props.run} type={type} onViewConversation={props.onViewConversation} />
        )}
      </CardFooter>
    </Card>
  );
}

// --- Scheduled internals ---

function ScheduledSubtitle({ task }: { task: ScheduledTask }) {
  const { t } = useTranslation();
  return formatSchedule(task, t);
}

function ScheduledFooter({
  task,
  onEdit,
  onDelete,
}: {
  task: ScheduledTask;
  onEdit: (taskId: Id<"scheduledTasks">) => void;
  onDelete: (taskId: Id<"scheduledTasks">) => void;
}) {
  const { t } = useTranslation();
  const toggleActive = useMutation(api.agents.mutations.toggleActive);
  const runNow = useAction(api.agents.actions.runTaskNow);

  const handleToggle = useCallback(async () => {
    try {
      await toggleActive({ taskId: task._id });
    } catch {
      toast.error(t("errors.toggleAgentFailed"));
    }
  }, [toggleActive, task._id, t]);

  const handleRunNow = useCallback(async () => {
    try {
      await runNow({ taskId: task._id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg.includes("already running") ? t("errors.taskAlreadyRunning") : t("errors.runNowFailed"));
    }
  }, [runNow, task._id, t]);

  const expired = isTaskExpired(task.expirationDate);

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {task.autoSendMessages && (
          <Badge variant="outline" className="text-xs">
            {t("labels.autoSend")}
          </Badge>
        )}
        {expired ? (
          <Badge variant="outline" className="text-xs">
            {t("status.expired")}
          </Badge>
        ) : (
          <Switch checked={task.isActive} onCheckedChange={handleToggle} size="sm" />
        )}
      </div>
      <AgentDropdown>
        <DropdownMenuItem onClick={handleRunNow}>
          {t("actions.runNow")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(task._id)}>
          {t("actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(task._id)}>
          {t("actions.delete")}
        </DropdownMenuItem>
      </AgentDropdown>
    </>
  );
}

// --- Run internals (running + completed) ---

function RunFooter({
  run,
  type,
  onViewConversation,
}: {
  run: TaskRun;
  type: "running" | "completed";
  onViewConversation?: (threadId: Id<"threads">) => void;
}) {
  const { t } = useTranslation();
  const stopMutation = useMutation(api.agents.mutations.stopTaskRun);
  const deleteMutation = useMutation(api.agents.mutations.deleteTaskRun);
  const [isBusy, setIsBusy] = useState(false);

  const isRunning = run.status === "running";

  const handleStop = useCallback(async () => {
    setIsBusy(true);
    try {
      await stopMutation({ runId: run._id });
    } catch {
      toast.error(t("errors.stopTaskFailed"));
    } finally {
      setIsBusy(false);
    }
  }, [stopMutation, run._id, t]);

  const handleDelete = useCallback(async () => {
    setIsBusy(true);
    try {
      await deleteMutation({ runId: run._id });
    } catch {
      toast.error(t("errors.deleteRunFailed"));
    } finally {
      setIsBusy(false);
    }
  }, [deleteMutation, run._id, t]);

  const hasActions = type === "running" || run.threadId;

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {isRunning ? (
          <Badge variant="outline" className="text-xs pl-0">
            <Spinner size={4} />
            {t("status.running")}
          </Badge>
        ) : (
          <Badge variant={RUN_STATUS_VARIANT[run.status] ?? "outline"} className="text-xs">
            {t(`status.${run.status}`)}
          </Badge>
        )}
      </div>
      {hasActions && (
        <AgentDropdown>
          {type === "running" && (
            isRunning ? (
              <DropdownMenuItem onClick={handleStop} disabled={isBusy}>
                {t("actions.stop")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleDelete} disabled={isBusy}>
                {t("actions.delete")}
              </DropdownMenuItem>
            )
          )}
          {run.threadId && onViewConversation && (
            <DropdownMenuItem onClick={() => onViewConversation(run.threadId!)}>
              {t("actions.viewConversation")}
            </DropdownMenuItem>
          )}
        </AgentDropdown>
      )}
    </>
  );
}

// --- Shared dropdown shell ---

function AgentDropdown({ children }: { children: ReactNode }) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <LazyDropdownMenu
        triggerClassName="flex items-center justify-center size-10 hover:bg-accent/60 cursor-pointer outline-none rounded-md"
        triggerContent={<Ellipsis className="size-4.5" />}
        contentProps={{ align: "end", sideOffset: 4 }}
      >
        {children}
      </LazyDropdownMenu>
    </div>
  );
}
