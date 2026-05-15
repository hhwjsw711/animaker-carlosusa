import { v } from "convex/values";
import { action, mutation, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveWorkspaceUserId, assertNotStaff } from "../lib/workspace";
import { assertPlanLimit } from "../billing/guards";
import { assertBunnyPathPrefix, IMAGE_ONLY } from "../bunny/validate";
import { uploadToBunny } from "../bunny/upload";

export const uploadCustomerPhoto = action({
  args: {
    customerId: v.id("customers"),
    bytes: v.bytes(),
    contentType: v.string(),
  },
  returns: v.object({ bunnyPath: v.string() }),
  handler: async (ctx, { customerId, bytes, contentType }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.runMutation(internal.rateLimit.mutations.checkUploadRateLimit, {
      userId,
    });

    const result = await uploadToBunny({
      bytes,
      contentType,
      size: bytes.byteLength,
      folder: `customers/${customerId}`,
      allowedCategories: IMAGE_ONLY,
    });

    return { bunnyPath: result.path };
  },
});

export const updateCustomerRegistration = mutation({
  args: {
    customerId: v.id("customers"),
    name: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    photoBunnyPath: v.optional(v.string()),
    removePhoto: v.optional(v.boolean()),
    gender: v.optional(
      v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("nonBinary"),
        v.literal("other"),
        v.literal("preferNotToSay"),
      ),
    ),
    document: v.optional(v.string()),
    documentType: v.optional(
      v.union(v.literal("cpf"), v.literal("ssn")),
    ),
    company: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    country: v.optional(v.string()),
    instagram: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    facebook: v.optional(v.string()),
    tiktok: v.optional(v.string()),
    youtube: v.optional(v.string()),
  },
  handler: async (ctx, { customerId, removePhoto, ...fields }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== effectiveUserId) {
      throw new Error("Customer not found");
    }

    if (fields.name !== undefined && !fields.name.trim()) {
      throw new Error("Name cannot be empty");
    }

    const patch: Record<string, unknown> = { ...fields };

    if (removePhoto) {
      if (customer.photoBunnyPath) {
        await ctx.scheduler.runAfter(
          0,
          internal.bunny.internalActions.deletePath,
          { path: customer.photoBunnyPath },
        );
      }
      patch.photoBunnyPath = undefined;
    } else if (
      fields.photoBunnyPath &&
      fields.photoBunnyPath !== customer.photoBunnyPath
    ) {
      assertBunnyPathPrefix(fields.photoBunnyPath, `customers/${customerId}`);
      if (customer.photoBunnyPath) {
        await ctx.scheduler.runAfter(
          0,
          internal.bunny.internalActions.deletePath,
          { path: customer.photoBunnyPath },
        );
      }
    }

    await ctx.db.patch(customerId, patch);
  },
});

export const createCustomer = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const trimmed = args.name.trim();
    if (!trimmed) throw new Error("Name is required");

    await assertPlanLimit(ctx, effectiveUserId, "customers");

    return await ctx.db.insert("customers", {
      userId: effectiveUserId,
      name: trimmed,
    });
  },
});

export const updateCustomerName = mutation({
  args: {
    customerId: v.id("customers"),
    name: v.string(),
  },
  handler: async (ctx, { customerId, name }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== effectiveUserId) {
      throw new Error("Customer not found");
    }

    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name is required");

    await ctx.db.patch(customerId, { name: trimmed });
  },
});

export const updateCustomerColor = mutation({
  args: {
    customerId: v.id("customers"),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { customerId, color }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== effectiveUserId) {
      throw new Error("Customer not found");
    }

    await ctx.db.patch(customerId, { color });
  },
});

export const deleteCustomer = mutation({
  args: {
    customerId: v.id("customers"),
  },
  handler: async (ctx, { customerId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== effectiveUserId) {
      throw new Error("Customer not found");
    }

    if (customer.photoBunnyPath) {
      await ctx.scheduler.runAfter(
        0,
        internal.bunny.internalActions.deletePath,
        { path: customer.photoBunnyPath },
      );
    }

    // Cascade delete scheduled tasks and their runs
    const tasks = await ctx.db
      .query("scheduledTasks")
      .withIndex("by_userId_and_customerId", (q) =>
        q.eq("userId", effectiveUserId).eq("customerId", customerId),
      )
      .take(500);

    for (const task of tasks) {
      if (task.scheduledFunctionId) {
        await ctx.scheduler.cancel(task.scheduledFunctionId);
      }
      const runs = await ctx.db
        .query("scheduledTaskRuns")
        .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
        .take(500);
      for (const run of runs) {
        await ctx.db.delete(run._id);
      }
      await ctx.db.delete(task._id);
    }

    const notes = await ctx.db
      .query("customerNotes")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .take(500);
    for (const note of notes) {
      await ctx.db.delete(note._id);
    }

    // Cascade delete customer service assignments and transactions
    const csAssignments = await ctx.db
      .query("customerServices")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .take(500);
    for (const assignment of csAssignments) {
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

    // Cascade delete customer product assignments and transactions
    const cpAssignments = await ctx.db
      .query("customerProducts")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .take(500);
    for (const assignment of cpAssignments) {
      const transactions = await ctx.db
        .query("productTransactions")
        .withIndex("by_customerProductId", (q) =>
          q.eq("customerProductId", assignment._id),
        )
        .take(500);
      for (const tx of transactions) {
        await ctx.db.delete(tx._id);
      }
      await ctx.db.delete(assignment._id);
    }

    // Cascade delete customer files (storage + RAG)
    const files = await ctx.db
      .query("customerFiles")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .take(500);
    for (const file of files) {
      if (file.bunnyPath) {
        await ctx.scheduler.runAfter(
          0,
          internal.bunny.internalActions.deletePath,
          { path: file.bunnyPath },
        );
      }
      if (file.ragEntryId) {
        await ctx.scheduler.runAfter(0, internal.customerFiles.actions.deleteFileChunks, {
          ragEntryId: file.ragEntryId,
        });
      }
      await ctx.db.delete(file._id);
    }

    // Cascade delete messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_customerId_and_channel_and_createdAt", (q) =>
        q.eq("customerId", customerId),
      )
      .take(500);
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(customerId);
  },
});

export const createCustomerInternal = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    gender: v.optional(v.string()),
    document: v.optional(v.string()),
    documentType: v.optional(v.string()),
    company: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    country: v.optional(v.string()),
    instagram: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    facebook: v.optional(v.string()),
    tiktok: v.optional(v.string()),
    youtube: v.optional(v.string()),
  },
  handler: async (ctx, { userId, name, ...optionalFields }) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name is required");

    await assertPlanLimit(ctx, userId, "customers");

    const fields: Record<string, unknown> = { userId, name: trimmed };
    for (const [key, value] of Object.entries(optionalFields)) {
      if (value !== undefined) fields[key] = value;
    }

    return await ctx.db.insert("customers", fields as { userId: typeof userId; name: string });
  },
});

export const updateCustomerInternal = internalMutation({
  args: {
    userId: v.id("users"),
    customerId: v.id("customers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    color: v.optional(v.string()),
    gender: v.optional(v.string()),
    document: v.optional(v.string()),
    documentType: v.optional(v.string()),
    company: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    country: v.optional(v.string()),
    instagram: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    facebook: v.optional(v.string()),
    tiktok: v.optional(v.string()),
    youtube: v.optional(v.string()),
  },
  handler: async (ctx, { userId, customerId, ...fields }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== userId) {
      throw new Error("Customer not found");
    }

    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (!trimmed) throw new Error("Name cannot be empty");
      fields.name = trimmed;
    }

    const patch: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }

    if (Object.keys(patch).length === 0) return;

    await ctx.db.patch(customerId, patch);
  },
});

export const deleteCustomerInternal = internalMutation({
  args: {
    userId: v.id("users"),
    customerId: v.id("customers"),
  },
  handler: async (ctx, { userId, customerId }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== userId) {
      throw new Error("Customer not found");
    }

    if (customer.photoBunnyPath) {
      await ctx.scheduler.runAfter(
        0,
        internal.bunny.internalActions.deletePath,
        { path: customer.photoBunnyPath },
      );
    }

    const tasks = await ctx.db
      .query("scheduledTasks")
      .withIndex("by_userId_and_customerId", (q) =>
        q.eq("userId", userId).eq("customerId", customerId),
      )
      .take(500);

    for (const task of tasks) {
      if (task.scheduledFunctionId) {
        await ctx.scheduler.cancel(task.scheduledFunctionId);
      }
      const runs = await ctx.db
        .query("scheduledTaskRuns")
        .withIndex("by_taskId", (q) => q.eq("taskId", task._id))
        .take(500);
      for (const run of runs) {
        await ctx.db.delete(run._id);
      }
      await ctx.db.delete(task._id);
    }

    const notes = await ctx.db
      .query("customerNotes")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .take(500);
    for (const note of notes) {
      await ctx.db.delete(note._id);
    }

    // Cascade delete customer service assignments and transactions
    const csAssignments = await ctx.db
      .query("customerServices")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .take(500);
    for (const assignment of csAssignments) {
      const csTx = await ctx.db
        .query("serviceTransactions")
        .withIndex("by_customerServiceId", (q) =>
          q.eq("customerServiceId", assignment._id),
        )
        .take(500);
      for (const tx of csTx) {
        await ctx.db.delete(tx._id);
      }
      await ctx.db.delete(assignment._id);
    }

    // Cascade delete customer product assignments and transactions
    const cpAssignments = await ctx.db
      .query("customerProducts")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .take(500);
    for (const assignment of cpAssignments) {
      const cpTx = await ctx.db
        .query("productTransactions")
        .withIndex("by_customerProductId", (q) =>
          q.eq("customerProductId", assignment._id),
        )
        .take(500);
      for (const tx of cpTx) {
        await ctx.db.delete(tx._id);
      }
      await ctx.db.delete(assignment._id);
    }

    // Cascade delete customer files (storage + RAG)
    const files = await ctx.db
      .query("customerFiles")
      .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
      .take(500);
    for (const file of files) {
      if (file.bunnyPath) {
        await ctx.scheduler.runAfter(
          0,
          internal.bunny.internalActions.deletePath,
          { path: file.bunnyPath },
        );
      }
      if (file.ragEntryId) {
        await ctx.scheduler.runAfter(0, internal.customerFiles.actions.deleteFileChunks, {
          ragEntryId: file.ragEntryId,
        });
      }
      await ctx.db.delete(file._id);
    }

    // Cascade delete messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_customerId_and_channel_and_createdAt", (q) =>
        q.eq("customerId", customerId),
      )
      .take(500);
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(customerId);
  },
});
