import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";
import { paginationOptsValidator } from "convex/server";

export const listServices = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return { page: [], isDone: true, continueCursor: "" };

    return await ctx.db
      .query("services")
      .withIndex("by_userId", (q) => q.eq("userId", ws.effectiveUserId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getService = query({
  args: { serviceId: v.id("services") },
  handler: async (ctx, { serviceId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    const service = await ctx.db.get(serviceId);
    if (!service || service.userId !== ws.effectiveUserId) return null;

    let categoryName: string | undefined;
    if (service.categoryId) {
      const category = await ctx.db.get(service.categoryId);
      categoryName = category?.name;
    }

    return { ...service, categoryName };
  },
});

// ─── Internal (for AI agent) ──────────────────────────────────────────────────

export const listActiveServicesLight = query({
  args: {},
  handler: async (ctx) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    const services = await ctx.db
      .query("services")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", ws.effectiveUserId).eq("status", "active"),
      )
      .take(500);

    return services.map((s) => ({ _id: s._id, name: s.name }));
  },
});

export const getServiceInternal = internalQuery({
  args: { userId: v.id("users"), serviceId: v.id("services") },
  handler: async (ctx, { userId, serviceId }) => {
    const service = await ctx.db.get(serviceId);
    if (!service || service.userId !== userId) return null;

    let categoryName: string | null = null;
    if (service.categoryId) {
      const category = await ctx.db.get(service.categoryId);
      categoryName = category?.name ?? null;
    }

    return {
      _id: service._id,
      name: service.name,
      description: service.description,
      category: categoryName,
      price: service.price,
      currency: service.currency,
      billingType: service.billingType,
      recurringInterval: service.recurringInterval,
      duration: service.duration,
      status: service.status,
    };
  },
});

export const listServicesInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const services = await ctx.db
      .query("services")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);

    const categories = await ctx.db
      .query("serviceCategories")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);

    const categoryMap = new Map(categories.map((c) => [c._id, c.name]));

    return services.map((s) => ({
      _id: s._id,
      name: s.name,
      description: s.description,
      category: s.categoryId ? categoryMap.get(s.categoryId) ?? null : null,
      price: s.price,
      currency: s.currency,
      billingType: s.billingType,
      recurringInterval: s.recurringInterval,
      duration: s.duration,
      status: s.status,
    }));
  },
});

export const searchServicesInternal = internalQuery({
  args: { userId: v.id("users"), search: v.string() },
  handler: async (ctx, { userId, search }) => {
    const services = await ctx.db
      .query("services")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);

    const categories = await ctx.db
      .query("serviceCategories")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);

    const categoryMap = new Map(categories.map((c) => [c._id, c.name]));

    const term = search.toLowerCase().trim();
    if (!term) return services.map((s) => ({
      _id: s._id,
      name: s.name,
      description: s.description,
      category: s.categoryId ? categoryMap.get(s.categoryId) ?? null : null,
      price: s.price,
      currency: s.currency,
      billingType: s.billingType,
      recurringInterval: s.recurringInterval,
      duration: s.duration,
      status: s.status,
    }));

    return services
      .filter((s) => {
        const catName = s.categoryId ? categoryMap.get(s.categoryId) : null;
        return (
          s.name.toLowerCase().includes(term) ||
          (s.description?.toLowerCase().includes(term) ?? false) ||
          (catName?.toLowerCase().includes(term) ?? false)
        );
      })
      .map((s) => ({
        _id: s._id,
        name: s.name,
        description: s.description,
        category: s.categoryId ? categoryMap.get(s.categoryId) ?? null : null,
        price: s.price,
        currency: s.currency,
        billingType: s.billingType,
        recurringInterval: s.recurringInterval,
        duration: s.duration,
        status: s.status,
      }));
  },
});

// ─── RAG ─────────────────────────────────────────────────────────────────────

export const getServiceForRag = internalQuery({
  args: { serviceId: v.id("services") },
  handler: async (ctx, { serviceId }) => {
    const service = await ctx.db.get(serviceId);
    if (!service) return null;

    let categoryName: string | null = null;
    if (service.categoryId) {
      const category = await ctx.db.get(service.categoryId);
      categoryName = category?.name ?? null;
    }

    return {
      userId: service.userId,
      name: service.name,
      description: service.description,
      categoryName,
      price: service.price,
      currency: service.currency,
      billingType: service.billingType,
      recurringInterval: service.recurringInterval,
      duration: service.duration,
      status: service.status,
    };
  },
});

export const listServicesWithoutRag = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("services").take(1000);
    return all.filter((s) => !s.ragEntryId).map((s) => s._id);
  },
});
