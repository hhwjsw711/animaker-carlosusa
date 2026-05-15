import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";

export const listByCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== ws.effectiveUserId) return [];

    const assignments = await ctx.db
      .query("customerServices")
      .withIndex("by_userId_and_customerId", (q) =>
        q.eq("userId", ws.effectiveUserId).eq("customerId", customerId),
      )
      .take(200);

    const results = [];
    for (const a of assignments) {
      const service = await ctx.db.get(a.serviceId);
      results.push({
        ...a,
        serviceName: service?.name ?? null,
        servicePrice: service?.price ?? 0,
        serviceCurrency: service?.currency ?? "BRL",
        serviceBillingType: service?.billingType ?? "one_time",
        serviceRecurringInterval: service?.recurringInterval ?? null,
        serviceStatus: service?.status ?? "inactive",
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
      .withIndex("by_userId_and_serviceId", (q) =>
        q.eq("userId", ws.effectiveUserId).eq("serviceId", serviceId),
      )
      .take(200);

    const results = [];
    for (const a of assignments) {
      const customer = await ctx.db.get(a.customerId);
      results.push({
        ...a,
        customerName: customer?.name ?? null,
        customerEmail: customer?.email ?? null,
        customerPhone: customer?.phone ?? null,
      });
    }

    return results;
  },
});

// ─── Internal (for AI agent) ──────────────────────────────────────────────────

export const listByCustomerInternal = internalQuery({
  args: { userId: v.id("users"), customerId: v.id("customers") },
  handler: async (ctx, { userId, customerId }) => {
    const assignments = await ctx.db
      .query("customerServices")
      .withIndex("by_userId_and_customerId", (q) =>
        q.eq("userId", userId).eq("customerId", customerId),
      )
      .take(100);

    const results = [];
    for (const a of assignments) {
      const service = await ctx.db.get(a.serviceId);
      results.push({
        _id: a._id,
        serviceId: a.serviceId,
        serviceName: service?.name ?? null,
        price: a.customPrice ?? service?.price ?? 0,
        currency: service?.currency ?? "BRL",
        billingType: service?.billingType ?? "one_time",
        status: a.status,
        startDate: a.startDate,
        endDate: a.endDate,
        nextBillingDate: a.nextBillingDate,
        notes: a.notes,
      });
    }

    return results;
  },
});

export const listByServiceInternal = internalQuery({
  args: { userId: v.id("users"), serviceId: v.id("services") },
  handler: async (ctx, { userId, serviceId }) => {
    const service = await ctx.db.get(serviceId);
    const assignments = await ctx.db
      .query("customerServices")
      .withIndex("by_userId_and_serviceId", (q) =>
        q.eq("userId", userId).eq("serviceId", serviceId),
      )
      .take(100);

    const results = [];
    for (const a of assignments) {
      const customer = await ctx.db.get(a.customerId);
      results.push({
        _id: a._id,
        customerId: a.customerId,
        customerName: customer?.name ?? null,
        price: a.customPrice ?? service?.price ?? 0,
        currency: service?.currency ?? "BRL",
        status: a.status,
        startDate: a.startDate,
        endDate: a.endDate,
      });
    }

    return results;
  },
});
