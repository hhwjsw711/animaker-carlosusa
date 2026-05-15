import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { resolveWorkspaceUserId, assertNotStaff } from "../lib/workspace";
import { assertPlanLimit } from "../billing/guards";

const billingTypeValidator = v.union(
  v.literal("one_time"),
  v.literal("recurring"),
);

const recurringIntervalValidator = v.optional(
  v.union(
    v.literal("weekly"),
    v.literal("biweekly"),
    v.literal("monthly"),
    v.literal("quarterly"),
    v.literal("semiannual"),
    v.literal("annual"),
  ),
);

const statusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
);

export const createService = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("serviceCategories")),
    price: v.number(),
    currency: v.string(),
    billingType: billingTypeValidator,
    recurringInterval: recurringIntervalValidator,
    duration: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const trimmed = args.name.trim();
    if (!trimmed) throw new Error("Name is required");
    if (args.price < 0) throw new Error("Price must be >= 0");

    await assertPlanLimit(ctx, effectiveUserId, "services");

    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category || category.userId !== effectiveUserId) {
        throw new Error("Category not found");
      }
    }

    const serviceId = await ctx.db.insert("services", {
      userId: effectiveUserId,
      name: trimmed,
      description: args.description?.trim() || undefined,
      categoryId: args.categoryId,
      price: args.price,
      currency: args.currency,
      billingType: args.billingType,
      recurringInterval: args.billingType === "recurring" ? args.recurringInterval : undefined,
      duration: args.duration?.trim() || undefined,
      status: "active",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.services.actions.indexServiceRag, { serviceId });
    return serviceId;
  },
});

export const updateService = mutation({
  args: {
    serviceId: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("serviceCategories")),
    removeCategoryId: v.optional(v.boolean()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    billingType: v.optional(billingTypeValidator),
    recurringInterval: recurringIntervalValidator,
    duration: v.optional(v.string()),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, { serviceId, removeCategoryId, ...fields }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const service = await ctx.db.get(serviceId);
    if (!service || service.userId !== effectiveUserId) {
      throw new Error("Service not found");
    }

    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (!trimmed) throw new Error("Name cannot be empty");
      fields.name = trimmed;
    }

    if (fields.price !== undefined && fields.price < 0) {
      throw new Error("Price must be >= 0");
    }

    if (fields.categoryId) {
      const category = await ctx.db.get(fields.categoryId);
      if (!category || category.userId !== effectiveUserId) {
        throw new Error("Category not found");
      }
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }

    if (removeCategoryId) {
      patch.categoryId = undefined;
    }

    // Clear recurringInterval if billingType changed to one_time
    const effectiveBillingType = fields.billingType ?? service.billingType;
    if (effectiveBillingType === "one_time") {
      patch.recurringInterval = undefined;
    }

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(serviceId, patch);

    const contentFields = ["name", "description", "categoryId", "price", "currency", "billingType", "recurringInterval", "duration"];
    const hasContentChange = contentFields.some((f) => f in patch) || removeCategoryId;
    if (hasContentChange) {
      await ctx.scheduler.runAfter(0, internal.services.actions.indexServiceRag, { serviceId });
    }
  },
});

export const deleteService = mutation({
  args: {
    serviceId: v.id("services"),
  },
  handler: async (ctx, { serviceId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const service = await ctx.db.get(serviceId);
    if (!service || service.userId !== effectiveUserId) {
      throw new Error("Service not found");
    }

    // Cascade delete customerServices and serviceTransactions
    const assignments = await ctx.db
      .query("customerServices")
      .withIndex("by_userId_and_serviceId", (q) =>
        q.eq("userId", effectiveUserId).eq("serviceId", serviceId),
      )
      .take(500);

    for (const assignment of assignments) {
      const transactions = await ctx.db
        .query("serviceTransactions")
        .withIndex("by_customerServiceId", (q) =>
          q.eq("customerServiceId", assignment._id),
        )
        .take(500);
      for (const tx of transactions) {
        await ctx.db.delete(tx._id);
      }
      await ctx.db.delete(assignment._id);
    }

    if (service.ragEntryId) {
      await ctx.scheduler.runAfter(0, internal.services.actions.deleteServiceRag, { ragEntryId: service.ragEntryId });
    }

    await ctx.db.delete(serviceId);
  },
});

// ─── Internal (for AI agent) ──────────────────────────────────────────────────

export const createServiceInternal = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("serviceCategories")),
    price: v.number(),
    currency: v.string(),
    billingType: billingTypeValidator,
    recurringInterval: recurringIntervalValidator,
    duration: v.optional(v.string()),
  },
  handler: async (ctx, { userId, ...args }) => {
    const trimmed = args.name.trim();
    if (!trimmed) throw new Error("Name is required");
    if (args.price < 0) throw new Error("Price must be >= 0");

    await assertPlanLimit(ctx, userId, "services");

    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category || category.userId !== userId) {
        throw new Error("Category not found");
      }
    }

    const serviceId = await ctx.db.insert("services", {
      userId,
      name: trimmed,
      description: args.description?.trim() || undefined,
      categoryId: args.categoryId,
      price: args.price,
      currency: args.currency,
      billingType: args.billingType,
      recurringInterval: args.billingType === "recurring" ? args.recurringInterval : undefined,
      duration: args.duration?.trim() || undefined,
      status: "active",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.services.actions.indexServiceRag, { serviceId });
    return serviceId;
  },
});

export const updateServiceInternal = internalMutation({
  args: {
    userId: v.id("users"),
    serviceId: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("serviceCategories")),
    removeCategoryId: v.optional(v.boolean()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    billingType: v.optional(billingTypeValidator),
    recurringInterval: recurringIntervalValidator,
    duration: v.optional(v.string()),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, { userId, serviceId, removeCategoryId, ...fields }) => {
    const service = await ctx.db.get(serviceId);
    if (!service || service.userId !== userId) {
      throw new Error("Service not found");
    }

    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (!trimmed) throw new Error("Name cannot be empty");
      fields.name = trimmed;
    }

    if (fields.price !== undefined && fields.price < 0) {
      throw new Error("Price must be >= 0");
    }

    if (fields.categoryId) {
      const category = await ctx.db.get(fields.categoryId);
      if (!category || category.userId !== userId) {
        throw new Error("Category not found");
      }
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }

    if (removeCategoryId) {
      patch.categoryId = undefined;
    }

    const effectiveBillingType = (fields.billingType ?? service.billingType) as string;
    if (effectiveBillingType === "one_time") {
      patch.recurringInterval = undefined;
    }

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(serviceId, patch);

    const contentFields = ["name", "description", "categoryId", "price", "currency", "billingType", "recurringInterval", "duration"];
    const hasContentChange = contentFields.some((f) => f in patch) || removeCategoryId;
    if (hasContentChange) {
      await ctx.scheduler.runAfter(0, internal.services.actions.indexServiceRag, { serviceId });
    }
  },
});

export const deleteServiceInternal = internalMutation({
  args: {
    userId: v.id("users"),
    serviceId: v.id("services"),
  },
  handler: async (ctx, { userId, serviceId }) => {
    const service = await ctx.db.get(serviceId);
    if (!service || service.userId !== userId) {
      throw new Error("Service not found");
    }

    const assignments = await ctx.db
      .query("customerServices")
      .withIndex("by_userId_and_serviceId", (q) =>
        q.eq("userId", userId).eq("serviceId", serviceId),
      )
      .take(500);

    for (const assignment of assignments) {
      const transactions = await ctx.db
        .query("serviceTransactions")
        .withIndex("by_customerServiceId", (q) =>
          q.eq("customerServiceId", assignment._id),
        )
        .take(500);
      for (const tx of transactions) {
        await ctx.db.delete(tx._id);
      }
      await ctx.db.delete(assignment._id);
    }

    if (service.ragEntryId) {
      await ctx.scheduler.runAfter(0, internal.services.actions.deleteServiceRag, { ragEntryId: service.ragEntryId });
    }

    await ctx.db.delete(serviceId);
  },
});

// ─── RAG ─────────────────────────────────────────────────────────────────────

export const updateServiceRagEntryId = internalMutation({
  args: {
    serviceId: v.id("services"),
    ragEntryId: v.string(),
  },
  handler: async (ctx, { serviceId, ragEntryId }) => {
    const service = await ctx.db.get(serviceId);
    if (!service) return;
    await ctx.db.patch(serviceId, { ragEntryId });
  },
});
