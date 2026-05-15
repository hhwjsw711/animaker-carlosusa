import { v } from "convex/values";
import { mutation, internalMutation, type MutationCtx } from "../_generated/server";
import { resolveWorkspaceUserId, assertNotStaff } from "../lib/workspace";
import { calculateNextDueDate } from "./utils";
import type { Id } from "../_generated/dataModel";

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("overdue"),
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

type RecurringInterval = "weekly" | "biweekly" | "monthly" | "quarterly" | "semiannual" | "annual";

async function handleAutoGenerate(
  ctx: MutationCtx,
  transaction: {
    customerServiceId: Id<"customerServices">;
    serviceId: Id<"services">;
    userId: Id<"users">;
    customerId: Id<"customers">;
    amount: number;
    dueDate: string;
  },
) {
  const assignment = await ctx.db.get(transaction.customerServiceId);
  if (!assignment || !assignment.autoGenerateNext) return;

  const service = await ctx.db.get(transaction.serviceId);
  if (!service || service.billingType !== "recurring" || !service.recurringInterval) return;

  const nextDueDate = calculateNextDueDate(
    transaction.dueDate,
    service.recurringInterval as RecurringInterval,
  );

  // Idempotency: check if a pending transaction already exists for this due date
  const existing = await ctx.db
    .query("serviceTransactions")
    .withIndex("by_customerServiceId_and_status_and_dueDate", (q) =>
      q
        .eq("customerServiceId", transaction.customerServiceId)
        .eq("status", "pending")
        .eq("dueDate", nextDueDate),
    )
    .first();

  if (existing) return;

  await ctx.db.insert("serviceTransactions", {
    userId: transaction.userId,
    customerServiceId: transaction.customerServiceId,
    customerId: transaction.customerId,
    serviceId: transaction.serviceId,
    amount: transaction.amount,
    status: "pending",
    dueDate: nextDueDate,
    createdAt: Date.now(),
  });

  await ctx.db.patch(assignment._id, {
    nextBillingDate: nextDueDate,
    lastBillingDate: transaction.dueDate,
  });
}

export const createTransaction = mutation({
  args: {
    customerServiceId: v.id("customerServices"),
    amount: v.number(),
    dueDate: v.string(),
    status: v.optional(statusValidator),
    paymentMethod: v.optional(paymentMethodValidator),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const assignment = await ctx.db.get(args.customerServiceId);
    if (!assignment || assignment.userId !== effectiveUserId) {
      throw new Error("Assignment not found");
    }

    if (args.amount < 0) throw new Error("Amount must be >= 0");

    return await ctx.db.insert("serviceTransactions", {
      userId: effectiveUserId,
      customerServiceId: args.customerServiceId,
      customerId: assignment.customerId,
      serviceId: assignment.serviceId,
      amount: args.amount,
      status: args.status ?? "pending",
      dueDate: args.dueDate,
      paymentMethod: args.paymentMethod,
      reference: args.reference?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
      createdAt: Date.now(),
    });
  },
});

export const updateTransaction = mutation({
  args: {
    transactionId: v.id("serviceTransactions"),
    status: v.optional(statusValidator),
    paidDate: v.optional(v.string()),
    paymentMethod: v.optional(paymentMethodValidator),
    amount: v.optional(v.number()),
    dueDate: v.optional(v.string()),
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

    if (fields.amount !== undefined && fields.amount < 0) {
      throw new Error("Amount must be >= 0");
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

    if (fields.status === "paid") {
      await handleAutoGenerate(ctx, {
        ...transaction,
        amount: fields.amount ?? transaction.amount,
        dueDate: fields.dueDate ?? transaction.dueDate,
      });
    }
  },
});

export const deleteTransaction = mutation({
  args: {
    transactionId: v.id("serviceTransactions"),
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
    customerServiceId: v.id("customerServices"),
    amount: v.number(),
    dueDate: v.string(),
    status: v.optional(statusValidator),
    paymentMethod: v.optional(paymentMethodValidator),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { userId, ...args }) => {
    const assignment = await ctx.db.get(args.customerServiceId);
    if (!assignment || assignment.userId !== userId) {
      throw new Error("Assignment not found");
    }

    if (args.amount < 0) throw new Error("Amount must be >= 0");

    return await ctx.db.insert("serviceTransactions", {
      userId,
      customerServiceId: args.customerServiceId,
      customerId: assignment.customerId,
      serviceId: assignment.serviceId,
      amount: args.amount,
      status: args.status ?? "pending",
      dueDate: args.dueDate,
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
    transactionId: v.id("serviceTransactions"),
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

    if (fields.status === "paid") {
      await handleAutoGenerate(ctx, transaction);
    }
  },
});

export const deleteTransactionInternal = internalMutation({
  args: {
    userId: v.id("users"),
    transactionId: v.id("serviceTransactions"),
  },
  handler: async (ctx, { userId, transactionId }) => {
    const transaction = await ctx.db.get(transactionId);
    if (!transaction || transaction.userId !== userId) {
      throw new Error("Transaction not found");
    }

    await ctx.db.delete(transactionId);
  },
});
