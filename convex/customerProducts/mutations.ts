import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { resolveWorkspaceUserId, assertNotStaff } from "../lib/workspace";

const statusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
);

export const assignProduct = mutation({
  args: {
    customerId: v.id("customers"),
    productId: v.id("products"),
    customPrice: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.userId !== effectiveUserId) {
      throw new Error("Customer not found");
    }

    const product = await ctx.db.get(args.productId);
    if (!product || product.userId !== effectiveUserId) {
      throw new Error("Product not found");
    }

    if (args.customPrice !== undefined && args.customPrice < 0) {
      throw new Error("Price must be >= 0");
    }

    return await ctx.db.insert("customerProducts", {
      userId: effectiveUserId,
      customerId: args.customerId,
      productId: args.productId,
      customPrice: args.customPrice,
      notes: args.notes?.trim() || undefined,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

export const updateAssignment = mutation({
  args: {
    customerProductId: v.id("customerProducts"),
    status: v.optional(statusValidator),
    customPrice: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { customerProductId, ...fields }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const assignment = await ctx.db.get(customerProductId);
    if (!assignment || assignment.userId !== effectiveUserId) {
      throw new Error("Assignment not found");
    }

    if (fields.customPrice !== undefined && fields.customPrice < 0) {
      throw new Error("Price must be >= 0");
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(customerProductId, patch);
  },
});

export const removeAssignment = mutation({
  args: {
    customerProductId: v.id("customerProducts"),
  },
  handler: async (ctx, { customerProductId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const assignment = await ctx.db.get(customerProductId);
    if (!assignment || assignment.userId !== effectiveUserId) {
      throw new Error("Assignment not found");
    }

    // Cascade delete transactions
    const transactions = await ctx.db
      .query("productTransactions")
      .withIndex("by_customerProductId", (q) =>
        q.eq("customerProductId", customerProductId),
      )
      .take(500);
    for (const tx of transactions) {
      await ctx.db.delete(tx._id);
    }

    await ctx.db.delete(customerProductId);
  },
});

// ─── Internal (for AI agent) ──────────────────────────────────────────────────

export const assignProductInternal = internalMutation({
  args: {
    userId: v.id("users"),
    customerId: v.id("customers"),
    productId: v.id("products"),
    customPrice: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { userId, ...args }) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.userId !== userId) {
      throw new Error("Customer not found");
    }

    const product = await ctx.db.get(args.productId);
    if (!product || product.userId !== userId) {
      throw new Error("Product not found");
    }

    return await ctx.db.insert("customerProducts", {
      userId,
      customerId: args.customerId,
      productId: args.productId,
      customPrice: args.customPrice,
      notes: args.notes?.trim() || undefined,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

export const removeAssignmentInternal = internalMutation({
  args: {
    userId: v.id("users"),
    customerProductId: v.id("customerProducts"),
  },
  handler: async (ctx, { userId, customerProductId }) => {
    const assignment = await ctx.db.get(customerProductId);
    if (!assignment || assignment.userId !== userId) {
      throw new Error("Assignment not found");
    }

    const transactions = await ctx.db
      .query("productTransactions")
      .withIndex("by_customerProductId", (q) =>
        q.eq("customerProductId", customerProductId),
      )
      .take(500);
    for (const tx of transactions) {
      await ctx.db.delete(tx._id);
    }

    await ctx.db.delete(customerProductId);
  },
});
