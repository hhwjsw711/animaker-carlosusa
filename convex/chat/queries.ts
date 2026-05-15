import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";
import { listMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { components } from "../_generated/api";

export const getThread = internalQuery({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    return await ctx.db.get(threadId);
  },
});

export const listThreads = query({
  args: {
    customerId: v.optional(v.id("customers")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // Filter by specific customer (exclude scheduled-task threads)
    if (args.customerId) {
      return await ctx.db
        .query("threads")
        .withIndex("by_userId_and_customerId_and_scheduledTaskId", (q) =>
          q
            .eq("userId", ws.effectiveUserId)
            .eq("customerId", args.customerId)
            .eq("scheduledTaskId", undefined),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    }

    // Show threads without a customer ("General"), exclude scheduled-task threads
    return await ctx.db
      .query("threads")
      .withIndex("by_userId_and_customerId_and_scheduledTaskId", (q) =>
        q
          .eq("userId", ws.effectiveUserId)
          .eq("customerId", undefined)
          .eq("scheduledTaskId", undefined),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const listFavoriteThreads = query({
  args: {
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    return await ctx.db
      .query("threads")
      .withIndex(
        "by_userId_and_favorite_and_scheduledTaskId_and_customerId",
        (q) =>
          q
            .eq("userId", ws.effectiveUserId)
            .eq("favorite", true)
            .eq("scheduledTaskId", undefined)
            .eq("customerId", args.customerId ?? undefined),
      )
      .order("desc")
      .take(100);
  },
});

export const getThreadById = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== ws.effectiveUserId) return null;
    return thread;
  },
});

export const getThreadStatus = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== ws.effectiveUserId) return null;

    const status = await ctx.db
      .query("threadStatus")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .unique();

    return {
      streamingAt: status?.streamingAt,
      cancelledAt: status?.cancelledAt,
    };
  },
});

export const getThreadStatusInternal = internalQuery({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    return await ctx.db
      .query("threadStatus")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .unique();
  },
});

export const listStreamingThreadIds = query({
  args: { threadIds: v.array(v.id("threads")) },
  handler: async (ctx, { threadIds }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    const streaming: string[] = [];
    for (const threadId of threadIds) {
      const status = await ctx.db
        .query("threadStatus")
        .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
        .unique();
      if (status?.streamingAt) {
        streaming.push(threadId);
      }
    }
    return streaming;
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const ws = await tryResolveWorkspaceUserId(ctx);

    // Verify ownership BEFORE fetching agent data to avoid unnecessary queries
    const thread = ws
      ? await ctx.db
          .query("threads")
          .withIndex("by_agentThreadId", (q) => q.eq("agentThreadId", args.threadId))
          .first()
      : null;

    if (!ws || !thread || thread.userId !== ws.effectiveUserId) {
      return { page: [], isDone: true, continueCursor: "", streams: [] };
    }

    const paginated = await listMessages(ctx, components.agent, {
      ...args,
      excludeToolMessages: false,
    });
    const streams = await syncStreams(ctx, components.agent, args);

    return { ...paginated, streams };
  },
});

