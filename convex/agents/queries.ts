import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";
import type { Id } from "../_generated/dataModel";

export const listScheduledTasks = query({
  args: {
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, { customerId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    let tasks;
    if (customerId !== undefined) {
      tasks = await ctx.db
        .query("scheduledTasks")
        .withIndex("by_userId_and_customerId", (q) =>
          q.eq("userId", ws.effectiveUserId).eq("customerId", customerId),
        )
        .take(200);
    } else {
      tasks = await ctx.db
        .query("scheduledTasks")
        .withIndex("by_userId_and_customerId", (q) =>
          q.eq("userId", ws.effectiveUserId).eq("customerId", undefined),
        )
        .take(200);
    }

    const customerIds = [
      ...new Set(
        tasks
          .map((t) => t.customerId)
          .filter((id): id is NonNullable<typeof id> => id !== undefined),
      ),
    ];

    const customers = await Promise.all(
      customerIds.map((id) => ctx.db.get(id)),
    );
    const customerMap = new Map(
      customers
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((c) => [c._id, c.name]),
    );

    return tasks
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((task) => ({
        ...task,
        customerName: task.customerId
          ? customerMap.get(task.customerId)
          : undefined,
      }));
  },
});

export const getScheduledTask = internalQuery({
  args: { taskId: v.id("scheduledTasks") },
  handler: async (ctx, { taskId }) => {
    return await ctx.db.get(taskId);
  },
});

export const countTaskRuns = query({
  args: {
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, { customerId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return 0;

    let tasks;
    if (customerId !== undefined) {
      tasks = await ctx.db
        .query("scheduledTasks")
        .withIndex("by_userId_and_customerId", (q) =>
          q.eq("userId", ws.effectiveUserId).eq("customerId", customerId),
        )
        .take(200);
    } else {
      tasks = await ctx.db
        .query("scheduledTasks")
        .withIndex("by_userId_and_customerId", (q) =>
          q.eq("userId", ws.effectiveUserId).eq("customerId", undefined),
        )
        .take(200);
    }

    return tasks.reduce((sum, t) => sum + t.runCount, 0);
  },
});

// Helper: get allowed task IDs filtered by customer
async function getAllowedTaskIds(
  ctx: { db: any },
  userId: Id<"users">,
  customerId?: Id<"customers">,
): Promise<Set<string>> {
  if (customerId !== undefined) {
    const customerTasks = await ctx.db
      .query("scheduledTasks")
      .withIndex("by_userId_and_customerId", (q: any) =>
        q.eq("userId", userId).eq("customerId", customerId),
      )
      .take(200);
    return new Set(customerTasks.map((t: any) => t._id));
  }
  const generalTasks = await ctx.db
    .query("scheduledTasks")
    .withIndex("by_userId_and_customerId", (q: any) =>
      q.eq("userId", userId).eq("customerId", undefined),
    )
    .take(200);
  return new Set(generalTasks.map((t: any) => t._id));
}

// Helper: enrich runs with task title
async function enrichRuns(
  ctx: { db: any },
  runs: any[],
  allowedTaskIds: Set<string>,
) {
  const taskIds = [...new Set(runs.map((r) => r.taskId))];
  const tasks = await Promise.all(taskIds.map((id) => ctx.db.get(id)));
  const taskMap = new Map(
    tasks
      .filter((t: any): t is NonNullable<typeof t> => t !== null)
      .map((t: any) => [t._id, { title: t.title, customerId: t.customerId }]),
  );

  return runs
    .filter((run) => allowedTaskIds.has(run.taskId))
    .map((run) => {
      const task = taskMap.get(run.taskId);
      return {
        ...run,
        taskTitle: task?.title ?? "",
        taskCustomerId: task?.customerId,
      };
    });
}

export const countRunningTaskRuns = query({
  args: {
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, { customerId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return 0;

    const allowedTaskIds = await getAllowedTaskIds(ctx, ws.effectiveUserId, customerId);

    const runningRuns = await ctx.db
      .query("scheduledTaskRuns")
      .withIndex("by_userId_and_status", (q: any) =>
        q.eq("userId", ws.effectiveUserId).eq("status", "running"),
      )
      .take(100);

    return runningRuns.filter((r: any) => allowedTaskIds.has(r.taskId)).length;
  },
});

export const listRunningTaskRuns = query({
  args: {
    customerId: v.optional(v.id("customers")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { customerId, paginationOpts }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const allowedTaskIds = await getAllowedTaskIds(ctx, ws.effectiveUserId, customerId);

    const result = await ctx.db
      .query("scheduledTaskRuns")
      .withIndex("by_userId_and_status", (q: any) =>
        q.eq("userId", ws.effectiveUserId).eq("status", "running"),
      )
      .order("desc")
      .paginate(paginationOpts);

    const enriched = await enrichRuns(ctx, result.page, allowedTaskIds);

    return {
      ...result,
      page: enriched,
    };
  },
});

export const isTaskRunning = internalQuery({
  args: { taskId: v.id("scheduledTasks") },
  handler: async (ctx, { taskId }) => {
    const run = await ctx.db
      .query("scheduledTaskRuns")
      .withIndex("by_taskId_and_status", (q) =>
        q.eq("taskId", taskId).eq("status", "running"),
      )
      .first();
    return run !== null;
  },
});

export const listTaskRuns = query({
  args: {
    customerId: v.optional(v.id("customers")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { customerId, paginationOpts }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const allowedTaskIds = await getAllowedTaskIds(ctx, ws.effectiveUserId, customerId);

    const result = await ctx.db
      .query("scheduledTaskRuns")
      .withIndex("by_userId_and_status", (q) => q.eq("userId", ws.effectiveUserId))
      .order("desc")
      .paginate(paginationOpts);

    const enriched = await enrichRuns(ctx, result.page, allowedTaskIds);

    // Exclude running runs — they belong to the "running" tab
    const filtered = enriched.filter((run: any) => run.status !== "running");

    return {
      ...result,
      page: filtered,
    };
  },
});
