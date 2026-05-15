import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { resolveWorkspaceUserId, assertNotStaff } from "../lib/workspace";

export const createCategory = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const trimmed = args.name.trim();
    if (!trimmed) throw new Error("Name is required");

    return await ctx.db.insert("serviceCategories", {
      userId: effectiveUserId,
      name: trimmed,
      color: args.color,
      createdAt: Date.now(),
    });
  },
});

export const updateCategory = mutation({
  args: {
    categoryId: v.id("serviceCategories"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { categoryId, ...fields }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const category = await ctx.db.get(categoryId);
    if (!category || category.userId !== effectiveUserId) {
      throw new Error("Category not found");
    }

    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (!trimmed) throw new Error("Name cannot be empty");
      fields.name = trimmed;
    }

    await ctx.db.patch(categoryId, fields);
  },
});

export const deleteCategory = mutation({
  args: {
    categoryId: v.id("serviceCategories"),
  },
  handler: async (ctx, { categoryId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const category = await ctx.db.get(categoryId);
    if (!category || category.userId !== effectiveUserId) {
      throw new Error("Category not found");
    }

    // Move services in this category to "Geral" (remove categoryId)
    const services = await ctx.db
      .query("services")
      .withIndex("by_userId_and_categoryId", (q) =>
        q.eq("userId", effectiveUserId).eq("categoryId", categoryId),
      )
      .take(500);

    for (const service of services) {
      await ctx.db.patch(service._id, { categoryId: undefined });
    }

    await ctx.db.delete(categoryId);
  },
});

// ─── Internal (for AI agent) ──────────────────────────────────────────────────

export const createCategoryInternal = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, { userId, name, color }) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name is required");

    return await ctx.db.insert("serviceCategories", {
      userId,
      name: trimmed,
      color,
      createdAt: Date.now(),
    });
  },
});
