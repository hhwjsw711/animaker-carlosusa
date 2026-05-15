import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    const categories = await ctx.db
      .query("serviceCategories")
      .withIndex("by_userId", (q) => q.eq("userId", ws.effectiveUserId))
      .take(100);

    return categories.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.createdAt - b.createdAt;
    });
  },
});

export const listCategoriesInternal = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const categories = await ctx.db
      .query("serviceCategories")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);

    return categories.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.createdAt - b.createdAt;
    });
  },
});

export const getCategoryInternal = internalQuery({
  args: {
    categoryId: v.id("serviceCategories"),
  },
  handler: async (ctx, { categoryId }) => {
    return await ctx.db.get(categoryId);
  },
});
