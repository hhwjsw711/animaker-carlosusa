import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";

export const listByCustomerService = query({
  args: { customerServiceId: v.id("customerServices") },
  handler: async (ctx, { customerServiceId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    const assignment = await ctx.db.get(customerServiceId);
    if (!assignment || assignment.userId !== ws.effectiveUserId) return [];

    return await ctx.db
      .query("serviceTransactions")
      .withIndex("by_customerServiceId", (q) =>
        q.eq("customerServiceId", customerServiceId),
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
      .query("serviceTransactions")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .order("desc")
      .take(200);

    const results = [];
    for (const tx of transactions) {
      const service = await ctx.db.get(tx.serviceId);
      results.push({
        ...tx,
        serviceName: service?.name ?? null,
      });
    }

    return results;
  },
});

export const listByService = query({
  args: { serviceId: v.id("services") },
  handler: async (ctx, { serviceId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    const service = await ctx.db.get(serviceId);
    if (!service || service.userId !== ws.effectiveUserId) return [];

    const assignments = await ctx.db
      .query("customerServices")
      .withIndex("by_serviceId", (q) => q.eq("serviceId", serviceId))
      .take(200);

    const results = [];
    for (const a of assignments) {
      const transactions = await ctx.db
        .query("serviceTransactions")
        .withIndex("by_customerServiceId", (q) =>
          q.eq("customerServiceId", a._id),
        )
        .order("desc")
        .take(50);

      const customer = await ctx.db.get(a.customerId);
      for (const tx of transactions) {
        results.push({
          ...tx,
          customerName: customer?.name ?? null,
        });
      }
    }

    return results.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getBillingSummary = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== ws.effectiveUserId) return null;

    const transactions = await ctx.db
      .query("serviceTransactions")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .take(500);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let totalOutstanding = 0;
    let totalOverdue = 0;
    let totalPaidThisMonth = 0;
    let countPending = 0;
    let countOverdue = 0;
    let countPaid = 0;
    let currency = "BRL";

    for (const tx of transactions) {
      if (tx.status === "pending") {
        totalOutstanding += tx.amount;
        countPending++;
      } else if (tx.status === "overdue") {
        totalOverdue += tx.amount;
        totalOutstanding += tx.amount;
        countOverdue++;
      } else if (tx.status === "paid") {
        countPaid++;
        if (tx.paidDate && tx.paidDate.startsWith(currentMonth)) {
          totalPaidThisMonth += tx.amount;
        }
      }
    }

    // Get currency from the first service found
    if (transactions.length > 0) {
      const service = await ctx.db.get(transactions[0].serviceId);
      if (service) currency = service.currency;
    }

    return {
      totalOutstanding,
      totalOverdue,
      totalPaidThisMonth,
      countPending,
      countOverdue,
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
        .query("serviceTransactions")
        .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
        .order("desc")
        .take(500);
    } else {
      transactions = await ctx.db
        .query("serviceTransactions")
        .withIndex("by_userId", (q) => q.eq("userId", ws.effectiveUserId))
        .order("desc")
        .take(500);
    }

    const results = [];
    for (const tx of transactions) {
      const [service, customer] = await Promise.all([
        ctx.db.get(tx.serviceId),
        ctx.db.get(tx.customerId),
      ]);
      results.push({
        ...tx,
        serviceName: service?.name ?? null,
        customerName: customer?.name ?? null,
        currency: service?.currency ?? "BRL",
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
        v.literal("overdue"),
        v.literal("cancelled"),
      ),
    ),
  },
  handler: async (ctx, { userId, customerId, status }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== userId) return [];

    const transactions = await ctx.db
      .query("serviceTransactions")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .order("desc")
      .take(200);

    const filtered = status
      ? transactions.filter((tx) => tx.status === status)
      : transactions;

    const results = [];
    for (const tx of filtered) {
      const service = await ctx.db.get(tx.serviceId);
      results.push({
        ...tx,
        serviceName: service?.name ?? null,
      });
    }

    return results;
  },
});

export const getBillingSummaryInternal = internalQuery({
  args: {
    userId: v.id("users"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, { userId, customerId }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== userId) return null;

    const transactions = await ctx.db
      .query("serviceTransactions")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .take(500);

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let totalOutstanding = 0;
    let totalOverdue = 0;
    let totalPaidThisMonth = 0;
    let countPending = 0;
    let countOverdue = 0;
    let countPaid = 0;

    for (const tx of transactions) {
      if (tx.status === "pending") {
        totalOutstanding += tx.amount;
        countPending++;
      } else if (tx.status === "overdue") {
        totalOverdue += tx.amount;
        totalOutstanding += tx.amount;
        countOverdue++;
      } else if (tx.status === "paid") {
        countPaid++;
        if (tx.paidDate && tx.paidDate.startsWith(currentMonth)) {
          totalPaidThisMonth += tx.amount;
        }
      }
    }

    return {
      totalOutstanding,
      totalOverdue,
      totalPaidThisMonth,
      countPending,
      countOverdue,
      countPaid,
    };
  },
});
