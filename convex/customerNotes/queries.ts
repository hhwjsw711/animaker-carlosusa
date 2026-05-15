import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";

export const listCustomerNotes = query({
  args: {
    customerId: v.id("customers"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { customerId, paginationOpts }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return { page: [], isDone: true, continueCursor: "" };

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== ws.effectiveUserId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.db
      .query("customerNotes")
      .withIndex("by_customerId_and_createdAt", (q) =>
        q.eq("customerId", customerId),
      )
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const listCustomerNotesInternal = internalQuery({
  args: {
    userId: v.id("users"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, { userId, customerId }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== userId) {
      return [];
    }

    const notes = await ctx.db
      .query("customerNotes")
      .withIndex("by_customerId_and_createdAt", (q) =>
        q.eq("customerId", customerId),
      )
      .order("desc")
      .take(200);

    return notes.map((n) => ({
      id: n._id as string,
      content: n.content,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt ?? null,
    }));
  },
});
