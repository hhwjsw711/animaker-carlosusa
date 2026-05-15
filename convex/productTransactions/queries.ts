import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";

export const listByCustomerProduct = query({
  args: { customerProductId: v.id("customerProducts") },
  handler: async (ctx, { customerProductId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    const assignment = await ctx.db.get(customerProductId);
    if (!assignment || assignment.userId !== ws.effectiveUserId) return [];

    return await ctx.db
      .query("productTransactions")
      .withIndex("by_customerProductId", (q) =>
        q.eq("customerProductId", customerProductId),
      )
      .order("desc")
      .take(200);
  },
});

export const listByCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== ws.effectiveUserId) return [];

    const transactions = await ctx.db
      .query("productTransactions")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .order("desc")
      .take(200);

    const results = [];
    for (const tx of transactions) {
      const product = await ctx.db.get(tx.productId);
      results.push({
        ...tx,
        productName: product?.name ?? null,
      });
    }

    return results;
  },
});

export const getPurchaseSummary = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== ws.effectiveUserId) return null;

    const transactions = await ctx.db
      .query("productTransactions")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .take(500);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let totalPending = 0;
    let totalPaidThisMonth = 0;
    let countPending = 0;
    let countPaid = 0;
    let currency = "BRL";

    for (const tx of transactions) {
      if (tx.status === "pending") {
        totalPending += tx.amount;
        countPending++;
      } else if (tx.status === "paid") {
        countPaid++;
        if (tx.paidDate && tx.paidDate.startsWith(currentMonth)) {
          totalPaidThisMonth += tx.amount;
        }
      }
    }

    // Get currency from the first product found
    if (transactions.length > 0) {
      const product = await ctx.db.get(transactions[0].productId);
      if (product) currency = product.currency;
    }

    return {
      totalPending,
      totalPaidThisMonth,
      countPending,
      countPaid,
      currency,
    };
  },
});

export const listAll = query({
  args: { customerId: v.optional(v.id("customers")) },
  handler: async (ctx, { customerId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    let transactions;
    if (customerId) {
      const customer = await ctx.db.get(customerId);
      if (!customer || customer.userId !== ws.effectiveUserId) return [];
      transactions = await ctx.db
        .query("productTransactions")
        .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
        .order("desc")
        .take(500);
    } else {
      transactions = await ctx.db
        .query("productTransactions")
        .withIndex("by_userId", (q) => q.eq("userId", ws.effectiveUserId))
        .order("desc")
        .take(500);
    }

    const results = [];
    for (const tx of transactions) {
      const [product, customer] = await Promise.all([
        ctx.db.get(tx.productId),
        ctx.db.get(tx.customerId),
      ]);
      results.push({
        ...tx,
        productName: product?.name ?? null,
        customerName: customer?.name ?? null,
        currency: product?.currency ?? "BRL",
      });
    }

    return results;
  },
});

// ─── Internal (for AI agent) ──────────────────────────────────────────────────

export const listByCustomerInternal = internalQuery({
  args: {
    userId: v.id("users"),
    customerId: v.id("customers"),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("paid"),
        v.literal("cancelled"),
      ),
    ),
  },
  handler: async (ctx, { userId, customerId, status }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== userId) return [];

    const transactions = await ctx.db
      .query("productTransactions")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .order("desc")
      .take(200);

    const filtered = status
      ? transactions.filter((tx) => tx.status === status)
      : transactions;

    const results = [];
    for (const tx of filtered) {
      const product = await ctx.db.get(tx.productId);
      results.push({
        ...tx,
        productName: product?.name ?? null,
      });
    }

    return results;
  },
});

export const getPurchaseSummaryInternal = internalQuery({
  args: {
    userId: v.id("users"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, { userId, customerId }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== userId) return null;

    const transactions = await ctx.db
      .query("productTransactions")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .take(500);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let totalPending = 0;
    let totalPaidThisMonth = 0;
    let countPending = 0;
    let countPaid = 0;

    for (const tx of transactions) {
      if (tx.status === "pending") {
        totalPending += tx.amount;
        countPending++;
      } else if (tx.status === "paid") {
        countPaid++;
        if (tx.paidDate && tx.paidDate.startsWith(currentMonth)) {
          totalPaidThisMonth += tx.amount;
        }
      }
    }

    return {
      totalPending,
      totalPaidThisMonth,
      countPending,
      countPaid,
    };
  },
});
