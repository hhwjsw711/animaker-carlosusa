import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { resolveWorkspaceUserId, assertNotStaff } from "../lib/workspace";
import { internal } from "../_generated/api";
import { assertPlanLimit } from "../billing/guards";
import { calculateFirstRunTime, calculateNextRunTime, isExpired, isValidTimezone } from "./utils";

const repeatTypeValidator = v.union(
  v.literal("none"),
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
);

export const createScheduledTask = mutation({
  args: {
    title: v.string(),
    prompt: v.string(),
    repeatType: repeatTypeValidator,
    scheduledDate: v.number(),
    scheduledTime: v.string(),
    weekDay: v.optional(v.number()),
    monthDay: v.optional(v.number()),
    timezone: v.string(),
    expirationDate: v.optional(v.number()),
    customerId: v.optional(v.id("customers")),
    autoSendMessages: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const trimmedTitle = args.title.trim();
    if (!trimmedTitle) throw new Error("Title is required");

    const trimmedPrompt = args.prompt.trim();
    if (!trimmedPrompt) throw new Error("Prompt is required");
    if (trimmedPrompt.length > 10_000) throw new Error("Prompt is too long (max 10,000 characters)");

    if (!/^\d{2}:\d{2}$/.test(args.scheduledTime)) {
      throw new Error("Invalid time format");
    }

    if (!isValidTimezone(args.timezone)) {
      throw new Error("Invalid timezone");
    }

    if (args.customerId) {
      const customer = await ctx.db.get(args.customerId);
      if (!customer || customer.userId !== effectiveUserId) {
        throw new Error("Customer not found");
      }
    }

    await assertPlanLimit(ctx, effectiveUserId, "agents");

    const taskId = await ctx.db.insert("scheduledTasks", {
      userId: effectiveUserId,
      customerId: args.customerId,
      title: trimmedTitle,
      prompt: trimmedPrompt,
      repeatType: args.repeatType,
      scheduledDate: args.scheduledDate,
      scheduledTime: args.scheduledTime,
      weekDay: args.weekDay,
      monthDay: args.monthDay,
      timezone: args.timezone,
      expirationDate: args.expirationDate,
      isActive: true,
      autoSendMessages: args.autoSendMessages,
      runCount: 0,
      createdAt: Date.now(),
    });

    const nextRunAt = calculateFirstRunTime(
      args.repeatType,
      args.scheduledDate,
      args.scheduledTime,
      args.timezone,
      args.weekDay,
      args.monthDay,
    );

    if (nextRunAt && !isExpired(args.expirationDate)) {
      const fnId = await ctx.scheduler.runAt(
        nextRunAt,
        internal.agents.actions.executeTask,
        { taskId },
      );
      await ctx.db.patch(taskId, { nextRunAt, scheduledFunctionId: fnId });
    }

    return taskId;
  },
});

export const updateScheduledTask = mutation({
  args: {
    taskId: v.id("scheduledTasks"),
    title: v.optional(v.string()),
    prompt: v.optional(v.string()),
    repeatType: v.optional(repeatTypeValidator),
    scheduledDate: v.optional(v.number()),
    scheduledTime: v.optional(v.string()),
    weekDay: v.optional(v.number()),
    monthDay: v.optional(v.number()),
    timezone: v.optional(v.string()),
    expirationDate: v.optional(v.number()),
    customerId: v.optional(v.id("customers")),
    autoSendMessages: v.optional(v.boolean()),
  },
  handler: async (ctx, { taskId, ...fields }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const task = await ctx.db.get(taskId);
    if (!task || task.userId !== effectiveUserId) {
      throw new Error("Task not found");
    }

    if (fields.title !== undefined) {
      const trimmed = fields.title.trim();
      if (!trimmed) throw new Error("Title is required");
      fields.title = trimmed;
    }

    if (fields.prompt !== undefined) {
      const trimmed = fields.prompt.trim();
      if (!trimmed) throw new Error("Prompt is required");
      if (trimmed.length > 10_000) throw new Error("Prompt is too long (max 10,000 characters)");
      fields.prompt = trimmed;
    }

    if (fields.scheduledTime !== undefined && !/^\d{2}:\d{2}$/.test(fields.scheduledTime)) {
      throw new Error("Invalid time format");
    }

    if (fields.timezone !== undefined && !isValidTimezone(fields.timezone)) {
      throw new Error("Invalid timezone");
    }

    if (fields.customerId) {
      const customer = await ctx.db.get(fields.customerId);
      if (!customer || customer.userId !== effectiveUserId) {
        throw new Error("Customer not found");
      }
    }

    if (task.scheduledFunctionId) {
      await ctx.scheduler.cancel(task.scheduledFunctionId);
    }

    const patch: Record<string, unknown> = { ...fields };

    await ctx.db.patch(taskId, patch);

    const updated = (await ctx.db.get(taskId))!;

    if (updated.isActive) {
      const nextRunAt = calculateFirstRunTime(
        updated.repeatType,
        updated.scheduledDate,
        updated.scheduledTime,
        updated.timezone,
        updated.weekDay,
        updated.monthDay,
      );

      if (nextRunAt && !isExpired(updated.expirationDate)) {
        const fnId = await ctx.scheduler.runAt(
          nextRunAt,
          internal.agents.actions.executeTask,
          { taskId },
        );
        await ctx.db.patch(taskId, {
          nextRunAt,
          scheduledFunctionId: fnId,
        });
      } else {
        await ctx.db.patch(taskId, {
          nextRunAt: undefined,
          scheduledFunctionId: undefined,
        });
      }
    }
  },
});

export const deleteScheduledTask = mutation({
  args: { taskId: v.id("scheduledTasks") },
  handler: async (ctx, { taskId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const task = await ctx.db.get(taskId);
    if (!task || task.userId !== effectiveUserId) {
      throw new Error("Task not found");
    }

    if (task.scheduledFunctionId) {
      await ctx.scheduler.cancel(task.scheduledFunctionId);
    }

    const runs = await ctx.db
      .query("scheduledTaskRuns")
      .withIndex("by_taskId", (q) => q.eq("taskId", taskId))
      .take(500);

    for (const run of runs) {
      await ctx.db.delete(run._id);
    }

    await ctx.db.delete(taskId);
  },
});

export const toggleActive = mutation({
  args: { taskId: v.id("scheduledTasks") },
  handler: async (ctx, { taskId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const task = await ctx.db.get(taskId);
    if (!task || task.userId !== effectiveUserId) {
      throw new Error("Task not found");
    }

    if (task.isActive) {
      if (task.scheduledFunctionId) {
        await ctx.scheduler.cancel(task.scheduledFunctionId);
      }
      await ctx.db.patch(taskId, {
        isActive: false,
        nextRunAt: undefined,
        scheduledFunctionId: undefined,
      });
    } else {
      const nextRunAt = calculateNextRunTime(
        task.repeatType,
        task.scheduledTime,
        task.timezone,
        task.weekDay,
        task.monthDay,
      );

      if (nextRunAt && !isExpired(task.expirationDate)) {
        const fnId = await ctx.scheduler.runAt(
          nextRunAt,
          internal.agents.actions.executeTask,
          { taskId },
        );
        await ctx.db.patch(taskId, {
          isActive: true,
          nextRunAt,
          scheduledFunctionId: fnId,
        });
      } else {
        await ctx.db.patch(taskId, { isActive: true });
      }
    }
  },
});

export const recordRunStart = internalMutation({
  args: {
    taskId: v.id("scheduledTasks"),
    userId: v.id("users"),
  },
  handler: async (ctx, { taskId, userId }) => {
    return await ctx.db.insert("scheduledTaskRuns", {
      taskId,
      userId,
      status: "running",
      startedAt: Date.now(),
    });
  },
});

export const recordRunComplete = internalMutation({
  args: {
    runId: v.id("scheduledTaskRuns"),
    taskId: v.id("scheduledTasks"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    threadId: v.optional(v.id("threads")),
    error: v.optional(v.string()),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, { runId, taskId, status, threadId, error, summary }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.status === "stopped") return;

    await ctx.db.patch(runId, {
      status,
      threadId,
      error,
      summary,
      completedAt: Date.now(),
    });

    const task = await ctx.db.get(taskId);
    if (task) {
      await ctx.db.patch(taskId, {
        lastRunAt: Date.now(),
        runCount: task.runCount + 1,
      });
    }
  },
});

export const stopTaskRun = mutation({
  args: { runId: v.id("scheduledTaskRuns") },
  handler: async (ctx, { runId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const run = await ctx.db.get(runId);
    if (!run || run.userId !== effectiveUserId) throw new Error("Run not found");
    if (run.status !== "running") return;

    await ctx.db.patch(runId, {
      status: "stopped",
      stoppedAt: Date.now(),
    });
  },
});

export const deleteTaskRun = mutation({
  args: { runId: v.id("scheduledTaskRuns") },
  handler: async (ctx, { runId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const run = await ctx.db.get(runId);
    if (!run || run.userId !== effectiveUserId) throw new Error("Run not found");
    if (run.status === "running") throw new Error("Cannot delete a running task");

    await ctx.db.delete(runId);
  },
});

export const rescheduleTask = internalMutation({
  args: {
    taskId: v.id("scheduledTasks"),
    nextRunAt: v.number(),
    scheduledFunctionId: v.id("_scheduled_functions"),
  },
  handler: async (ctx, { taskId, nextRunAt, scheduledFunctionId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) return;

    if (task.scheduledFunctionId) {
      try {
        await ctx.scheduler.cancel(task.scheduledFunctionId);
      } catch {
        // Already completed or cancelled
      }
    }

    await ctx.db.patch(taskId, { nextRunAt, scheduledFunctionId });
  },
});

export const cancelExistingSchedule = internalMutation({
  args: { taskId: v.id("scheduledTasks") },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) return;

    if (task.scheduledFunctionId) {
      try {
        await ctx.scheduler.cancel(task.scheduledFunctionId);
      } catch {
        // Already completed or cancelled
      }
      await ctx.db.patch(taskId, {
        scheduledFunctionId: undefined,
      });
    }
  },
});

export const deactivateTask = internalMutation({
  args: { taskId: v.id("scheduledTasks") },
  handler: async (ctx, { taskId }) => {
    const task = await ctx.db.get(taskId);
    if (!task) return;
    await ctx.db.patch(taskId, {
      isActive: false,
      nextRunAt: undefined,
      scheduledFunctionId: undefined,
    });
  },
});
