import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { resolveWorkspaceUserId } from "../lib/workspace";
import { components, internal } from "../_generated/api";
import { listStreams, abortStream } from "@convex-dev/agent";

export const createThread = mutation({
  args: {
    title: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;

    return await ctx.db.insert("threads", {
      userId: effectiveUserId,
      title: args.title,
      customerId: args.customerId,
    });
  },
});

export const insertThread = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    scheduledTaskId: v.optional(v.id("scheduledTasks")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("threads", {
      userId: args.userId,
      title: args.title,
      customerId: args.customerId,
      scheduledTaskId: args.scheduledTaskId,
    });
  },
});

export const updateThreadTitle = mutation({
  args: {
    threadId: v.id("threads"),
    title: v.string(),
  },
  handler: async (ctx, { threadId, title }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;

    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== effectiveUserId) {
      throw new Error("Thread not found");
    }

    await ctx.db.patch(threadId, { title });
  },
});

export const setAgentThreadId = internalMutation({
  args: {
    threadId: v.id("threads"),
    agentThreadId: v.string(),
  },
  handler: async (ctx, { threadId, agentThreadId }) => {
    const thread = await ctx.db.get(threadId);
    if (thread?.agentThreadId) return;
    await ctx.db.patch(threadId, { agentThreadId });
  },
});

export const toggleFavorite = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;

    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== effectiveUserId) {
      throw new Error("Thread not found");
    }

    await ctx.db.patch(threadId, { favorite: !thread.favorite });
  },
});

export const updateThreadCustomer = mutation({
  args: {
    threadId: v.id("threads"),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, { threadId, customerId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;

    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== effectiveUserId) {
      throw new Error("Thread not found");
    }

    await ctx.db.patch(threadId, { customerId });
  },
});

export const deleteThread = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;

    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== effectiveUserId) {
      throw new Error("Thread not found");
    }

    // Cascade: delete agent thread data
    if (thread.agentThreadId) {
      await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, {
        threadId: thread.agentThreadId,
      });
    }

    // Cascade: delete chat attachment files from storage
    await ctx.runMutation(internal.chatAttachments.mutations.deleteByThread, {
      threadId,
    });

    await ctx.db.delete(threadId);
  },
});

// ─── Thread Status helpers (writes to threadStatus table) ─────────────────────

async function getOrCreateStatus(ctx: { db: import("../_generated/server").MutationCtx["db"] }, threadId: import("../_generated/dataModel").Id<"threads">) {
  const existing = await ctx.db
    .query("threadStatus")
    .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
    .unique();
  if (existing) return existing;
  const id = await ctx.db.insert("threadStatus", { threadId });
  return (await ctx.db.get(id))!;
}

export const cancelStream = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;

    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== effectiveUserId) {
      throw new Error("Thread not found");
    }

    const status = await getOrCreateStatus(ctx, threadId);
    await ctx.db.patch(status._id, { cancelledAt: Date.now(), streamingAt: undefined });

    if (thread.agentThreadId) {
      const streams = await listStreams(ctx, components.agent, {
        threadId: thread.agentThreadId,
        includeStatuses: ["streaming"],
      });
      for (const stream of streams) {
        await abortStream(ctx, components.agent, {
          streamId: stream.streamId,
          reason: "user_cancelled",
        });
      }
    }
  },
});

export const setStreamingAt = internalMutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const status = await getOrCreateStatus(ctx, threadId);
    await ctx.db.patch(status._id, { streamingAt: Date.now() });
  },
});

export const clearStreamingAt = internalMutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const status = await getOrCreateStatus(ctx, threadId);
    await ctx.db.patch(status._id, { streamingAt: undefined });
  },
});


export const clearCancelledAt = internalMutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const status = await getOrCreateStatus(ctx, threadId);
    await ctx.db.patch(status._id, { cancelledAt: undefined });
  },
});
