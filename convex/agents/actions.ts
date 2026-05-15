import { v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";
import { getAgent, MAX_STEPS } from "../chat/agent";
import { DEFAULT_MODEL, FALLBACK_MODELS, getProviderOptions, getSamplingParams } from "../chat/models";
import type { ToolExecutionContext } from "../tools";
import { internal } from "../_generated/api";
import { calculateNextRunTime, isExpired } from "./utils";
import { assertHasCredits } from "../billing/guards";

export const executeTask = internalAction({
  args: { taskId: v.id("scheduledTasks") },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.runQuery(
      internal.agents.queries.getScheduledTask,
      { taskId },
    );

    if (!task || !task.isActive) return;
    if (isExpired(task.expirationDate)) {
      await ctx.runMutation(internal.agents.mutations.deactivateTask, {
        taskId,
      });
      return;
    }

    const alreadyRunning = await ctx.runQuery(
      internal.agents.queries.isTaskRunning,
      { taskId },
    );
    if (alreadyRunning) return;

    await assertHasCredits(ctx, task.userId, 5);

    const runId = await ctx.runMutation(
      internal.agents.mutations.recordRunStart,
      { taskId, userId: task.userId },
    );

    let threadId;
    let summary: string | undefined;

    try {
      threadId = await ctx.runMutation(internal.chat.mutations.insertThread, {
        userId: task.userId,
        title: task.title,
        customerId: task.customerId,
        scheduledTaskId: taskId,
      });

      const now = new Date();
      const userDate = new Intl.DateTimeFormat("en-US", {
        timeZone: task.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        weekday: "long",
        hour12: false,
      }).format(now);

      const enabledSkills = await ctx.runQuery(
        internal.skills.queries.listEnabledSkills,
        { userId: task.userId },
      );

      const execCtx: ToolExecutionContext | undefined =
        task.autoSendMessages && task.customerId
          ? { mode: "scheduled" }
          : undefined;

      const modelChain = [DEFAULT_MODEL, ...FALLBACK_MODELS];
      let agentThreadId: string | undefined;

      for (let modelIdx = 0; modelIdx < modelChain.length; modelIdx++) {
        const currentModel = modelChain[modelIdx];

        const agent = getAgent(
          task.customerId ?? undefined,
          userDate,
          enabledSkills,
          execCtx,
          "scheduled",
          task.userId,
          currentModel,
        );

        let thread;
        if (agentThreadId) {
          const continued = await agent.continueThread(ctx, {
            threadId: agentThreadId,
            userId: task.userId,
          });
          thread = continued.thread;
        } else {
          const created = await agent.createThread(ctx, {
            userId: task.userId,
          });
          thread = created.thread;
          agentThreadId = created.threadId;

          await ctx.runMutation(internal.chat.mutations.setAgentThreadId, {
            threadId,
            agentThreadId,
          });
        }

        const providerOptions = getProviderOptions(currentModel);
        const samplingParams = getSamplingParams(currentModel);

        try {
          const result = await thread.generateText(
            {
              prompt: task.prompt.slice(0, 10_000),
              ...(providerOptions ? { providerOptions } : {}),
              ...(samplingParams ?? {}),
              prepareStep: ({ stepNumber, steps }) => {
                const totalToolCalls = steps.reduce(
                  (sum, s) => sum + s.toolCalls.length,
                  0,
                );
                if (stepNumber >= MAX_STEPS - 2 || totalToolCalls >= 10) {
                  return { toolChoice: "none" as const };
                }
                return undefined;
              },
            },
          );

          summary = result.text?.slice(0, 200);
          break; // Success — exit model chain
        } catch (modelErr) {
          console.error(`Scheduled task model ${currentModel} failed:`, modelErr);
          if (modelIdx < modelChain.length - 1) {
            console.warn(`Falling back to ${modelChain[modelIdx + 1]}`);
            continue;
          }
          throw modelErr; // All models failed
        }
      }

      await ctx.runMutation(
        internal.agents.mutations.recordRunComplete,
        {
          runId,
          taskId,
          status: "completed",
          threadId,
          summary,
        },
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await ctx.runMutation(
        internal.agents.mutations.recordRunComplete,
        {
          runId,
          taskId,
          status: "failed",
          threadId,
          error: errorMsg,
        },
      );
    }

    // Reschedule if recurring
    const freshTask = await ctx.runQuery(
      internal.agents.queries.getScheduledTask,
      { taskId },
    );
    if (!freshTask || !freshTask.isActive || freshTask.repeatType === "none") {
      if (freshTask && freshTask.repeatType === "none") {
        await ctx.runMutation(
          internal.agents.mutations.deactivateTask,
          { taskId },
        );
      }
      return;
    }

    if (isExpired(freshTask.expirationDate)) {
      await ctx.runMutation(
        internal.agents.mutations.deactivateTask,
        { taskId },
      );
      return;
    }

    const nextRunAt = calculateNextRunTime(
      freshTask.repeatType,
      freshTask.scheduledTime,
      freshTask.timezone,
      freshTask.weekDay,
      freshTask.monthDay,
    );

    if (nextRunAt) {
      const fnId = await ctx.scheduler.runAt(
        nextRunAt,
        internal.agents.actions.executeTask,
        { taskId },
      );
      await ctx.runMutation(
        internal.agents.mutations.rescheduleTask,
        { taskId, nextRunAt, scheduledFunctionId: fnId },
      );
    }
  },
});

export const runTaskNow = action({
  args: { taskId: v.id("scheduledTasks") },
  handler: async (ctx, { taskId }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");

    const ws = await ctx.runQuery(internal.workspace.queries.resolveForAction, {
      authenticatedUserId: authUserId,
    });
    if (ws.collaboratorRole === "staff") throw new Error("Insufficient permissions");
    const userId = ws.effectiveUserId as Id<"users">;

    const task = await ctx.runQuery(
      internal.agents.queries.getScheduledTask,
      { taskId },
    );
    if (!task || task.userId !== userId) {
      throw new Error("Task not found");
    }

    const alreadyRunning = await ctx.runQuery(
      internal.agents.queries.isTaskRunning,
      { taskId },
    );
    if (alreadyRunning) {
      throw new Error("Task is already running");
    }

    await ctx.runMutation(
      internal.agents.mutations.cancelExistingSchedule,
      { taskId },
    );

    await ctx.scheduler.runAfter(
      0,
      internal.agents.actions.executeTask,
      { taskId },
    );
  },
});
