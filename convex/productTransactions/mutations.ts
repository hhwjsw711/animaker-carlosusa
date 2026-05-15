import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { resolveWorkspaceUserId, assertNotStaff } from "../lib/workspace";

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("cancelled"),
);

const paymentMethodValidator = v.union(
  v.literal("pix"),
  v.literal("cash"),
  v.literal("credit_card"),
  v.literal("bank_transfer"),
  v.literal("boleto"),
  v.literal("other"),
);

export const createTransaction = mutation({
  args: {
    customerProductId: v.id("customerProducts"),
    quantity: v.number(),
    unitPrice: v.number(),
    purchaseDate: v.string(),
    status: v.optional(statusValidator),
    paymentMethod: v.optional(paymentMethodValidator),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const assignment = await ctx.db.get(args.customerProductId);
    if (!assignment || assignment.userId !== effectiveUserId) {
      throw new Error("Assignment not found");
    }

    if (args.quantity < 1) throw new Error("Quantity must be >= 1");
    if (args.unitPrice < 0) throw new Error("Unit price must be >= 0");

    const amount = Math.round(args.quantity * args.unitPrice);

    return await ctx.db.insert("productTransactions", {
      userId: effectiveUserId,
      customerProductId: args.customerProductId,
      customerId: assignment.customerId,
      productId: assignment.productId,
      quantity: args.quantity,
      unitPrice: args.unitPrice,
      amount,
      status: args.status ?? "pending",
      purchaseDate: args.purchaseDate,
      paymentMethod: args.paymentMethod,
      reference: args.reference?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      createdAt: Date.now(),
    });
  },
});

export const updateTransaction = mutation({
  args: {
    transactionId: v.id("productTransactions"),
    status: v.optional(statusValidator),
    paidDate: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodValidator),
    quantity: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    purchaseDate: v.optional(v.string()),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { transactionId, ...fields }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const transaction = await ctx.db.get(transactionId);
    if (!transaction || transaction.userId !== effectiveUserId) {
      throw new Error("Transaction not found");
    }

    if (fields.quantity !== undefined && fields.quantity < 1) {
      throw new Error("Quantity must be >= 1");
    }
    if (fields.unitPrice !== undefined && fields.unitPrice < 0) {
      throw new Error("Unit price must be >= 0");
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }

    // Recalculate amount if quantity or unitPrice changed
    const effectiveQty = fields.quantity ?? transaction.quantity;
    const effectivePrice = fields.unitPrice ?? transaction.unitPrice;
    if (fields.quantity !== undefined || fields.unitPrice !== undefined) {
      patch.amount = Math.round(effectiveQty * effectivePrice);
    }

    if (fields.status === "paid" && !fields.paidDate) {
      patch.paidDate = new Date().toISOString().slice(0, 10);
    }

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(transactionId, patch);
  },
});

export const deleteTransaction = mutation({
  args: {
    transactionId: v.id("productTransactions"),
  },
  handler: async (ctx, { transactionId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const transaction = await ctx.db.get(transactionId);
    if (!transaction || transaction.userId !== effectiveUserId) {
      throw new Error("Transaction not found");
    }

    await ctx.db.delete(transactionId);
  },
});

// ─── Internal (for AI agent) ──────────────────────────────────────────────────

export const createTransactionInternal = internalMutation({
  args: {
    userId: v.id("users"),
    customerProductId: v.id("customerProducts"),
    quantity: v.number(),
    unitPrice: v.number(),
    purchaseDate: v.string(),
    status: v.optional(statusValidator),
    paymentMethod: v.optional(paymentMethodValidator),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { userId, ...args }) => {
    const assignment = await ctx.db.get(args.customerProductId);
    if (!assignment || assignment.userId !== userId) {
      throw new Error("Assignment not found");
    }

    if (args.quantity < 1) throw new Error("Quantity must be >= 1");
    if (args.unitPrice < 0) throw new Error("Unit price must be >= 0");

    const amount = Math.round(args.quantity * args.unitPrice);

    return await ctx.db.insert("productTransactions", {
      userId,
      customerProductId: args.customerProductId,
      customerId: assignment.customerId,
      productId: assignment.productId,
      quantity: args.quantity,
      unitPrice: args.unitPrice,
      amount,
      status: args.status ?? "pending",
      purchaseDate: args.purchaseDate,
      paymentMethod: args.paymentMethod,
      reference: args.reference?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      createdAt: Date.now(),
    });
  },
});

export const updateTransactionInternal = internalMutation({
  args: {
    userId: v.id("users"),
    transactionId: v.id("productTransactions"),
    status: v.optional(statusValidator),
    paidDate: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodValidator),
  },
  handler: async (ctx, { userId, transactionId, ...fields }) => {
    const transaction = await ctx.db.get(transactionId);
    if (!transaction || transaction.userId !== userId) {
      throw new Error("Transaction not found");
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }

    if (fields.status === "paid" && !fields.paidDate) {
      patch.paidDate = new Date().toISOString().slice(0, 10);
    }

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(transactionId, patch);
  },
});

export const deleteTransactionInternal = internalMutation({
  args: {
    userId: v.id("users"),
    transactionId: v.id("productTransactions"),
  },
  handler: async (ctx, { userId, transactionId }) => {
    const transaction = await ctx.db.get(transactionId);
    if (!transaction || transaction.userId !== userId) {
      throw new Error("Transaction not found");
    }

    await ctx.db.delete(transactionId);
  },
});
