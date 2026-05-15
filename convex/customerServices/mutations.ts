import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { resolveWorkspaceUserId, assertNotStaff } from "../lib/workspace";

const statusValidator = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("cancelled"),
  v.literal("completed"),
);

export const assignService = mutation({
  args: {
    customerId: v.id("customers"),
    serviceId: v.id("services"),
    startDate: v.string(),
    customPrice: v.optional(v.number()),
    notes: v.optional(v.string()),
    autoGenerateNext: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.userId !== effectiveUserId) {
      throw new Error("Customer not found");
    }

    const service = await ctx.db.get(args.serviceId);
    if (!service || service.userId !== effectiveUserId) {
      throw new Error("Service not found");
    }

    if (args.customPrice !== undefined && args.customPrice < 0) {
      throw new Error("Price must be >= 0");
    }

    const isRecurring = service.billingType === "recurring";
    const autoGen = args.autoGenerateNext ?? isRecurring;

    const assignmentId = await ctx.db.insert("customerServices", {
      userId: effectiveUserId,
      customerId: args.customerId,
      serviceId: args.serviceId,
      customPrice: args.customPrice,
      startDate: args.startDate,
      status: "active",
      nextBillingDate: isRecurring ? args.startDate : undefined,
      autoGenerateNext: autoGen || undefined,
      notes: args.notes?.trim() || undefined,
      createdAt: Date.now(),
    });

    // Auto-create first transaction
    const amount = args.customPrice ?? service.price;
    await ctx.db.insert("serviceTransactions", {
      userId: effectiveUserId,
      customerServiceId: assignmentId,
      customerId: args.customerId,
      serviceId: args.serviceId,
      amount,
      status: "pending",
      dueDate: args.startDate,
      createdAt: Date.now(),
    });

    return assignmentId;
  },
});

export const updateAssignment = mutation({
  args: {
    customerServiceId: v.id("customerServices"),
    status: v.optional(statusValidator),
    customPrice: v.optional(v.number()),
    endDate: v.optional(v.string()),
    nextBillingDate: v.optional(v.string()),
    lastBillingDate: v.optional(v.string()),
    autoGenerateNext: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { customerServiceId, ...fields }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const assignment = await ctx.db.get(customerServiceId);
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
    await ctx.db.patch(customerServiceId, patch);
  },
});

export const removeAssignment = mutation({
  args: {
    customerServiceId: v.id("customerServices"),
  },
  handler: async (ctx, { customerServiceId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const assignment = await ctx.db.get(customerServiceId);
    if (!assignment || assignment.userId !== effectiveUserId) {
      throw new Error("Assignment not found");
    }

    // Cascade delete transactions
    const transactions = await ctx.db
      .query("serviceTransactions")
      .withIndex("by_customerServiceId", (q) =>
        q.eq("customerServiceId", customerServiceId),
      )
      .take(500);
    for (const tx of transactions) {
      await ctx.db.delete(tx._id);
    }

    await ctx.db.delete(customerServiceId);
  },
});

// ─── Internal (for AI agent) ──────────────────────────────────────────────────

export const assignServiceInternal = internalMutation({
  args: {
    userId: v.id("users"),
    customerId: v.id("customers"),
    serviceId: v.id("services"),
    startDate: v.string(),
    customPrice: v.optional(v.number()),
    notes: v.optional(v.string()),
    autoGenerateNext: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, ...args }) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.userId !== userId) {
      throw new Error("Customer not found");
    }

    const service = await ctx.db.get(args.serviceId);
    if (!service || service.userId !== userId) {
      throw new Error("Service not found");
    }

    const isRecurring = service.billingType === "recurring";
    const autoGen = args.autoGenerateNext ?? isRecurring;

    const assignmentId = await ctx.db.insert("customerServices", {
      userId,
      customerId: args.customerId,
      serviceId: args.serviceId,
      customPrice: args.customPrice,
      startDate: args.startDate,
      status: "active",
      nextBillingDate: isRecurring ? args.startDate : undefined,
      autoGenerateNext: autoGen || undefined,
      notes: args.notes?.trim() || undefined,
      createdAt: Date.now(),
    });

    // Auto-create first transaction
    const amount = args.customPrice ?? service.price;
    await ctx.db.insert("serviceTransactions", {
      userId,
      customerServiceId: assignmentId,
      customerId: args.customerId,
      serviceId: args.serviceId,
      amount,
      status: "pending",
      dueDate: args.startDate,
      createdAt: Date.now(),
    });

    return assignmentId;
  },
});

export const removeAssignmentInternal = internalMutation({
  args: {
    userId: v.id("users"),
    customerServiceId: v.id("customerServices"),
  },
  handler: async (ctx, { userId, customerServiceId }) => {
    const assignment = await ctx.db.get(customerServiceId);
    if (!assignment || assignment.userId !== userId) {
      throw new Error("Assignment not found");
    }

    const transactions = await ctx.db
      .query("serviceTransactions")
      .withIndex("by_customerServiceId", (q) =>
        q.eq("customerServiceId", customerServiceId),
      )
      .take(500);
    for (const tx of transactions) {
      await ctx.db.delete(tx._id);
    }

    await ctx.db.delete(customerServiceId);
  },
});
