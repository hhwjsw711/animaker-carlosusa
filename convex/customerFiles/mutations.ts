import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { resolveWorkspaceUserId, assertNotStaff } from "../lib/workspace";
import {
  assertAllowedMime,
  assertBunnyPathPrefix,
  assertMaxSize,
  ANY_CATEGORY,
} from "../bunny/validate";

export const createCustomerFile = mutation({
  args: {
    customerId: v.id("customers"),
    bunnyPath: v.string(),
    name: v.string(),
    type: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const userId = ws.effectiveUserId;

    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.userId !== userId) {
      throw new Error("Customer not found");
    }

    assertBunnyPathPrefix(args.bunnyPath, `customerFiles/${args.customerId}`);
    const category = assertAllowedMime(args.type, ANY_CATEGORY);
    assertMaxSize(args.size, category);

    const fileId = await ctx.db.insert("customerFiles", {
      userId,
      customerId: args.customerId,
      bunnyPath: args.bunnyPath,
      name: args.name,
      type: args.type,
      size: args.size,
      category,
      status: "processing",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.customerFiles.actions.processFile,
      { fileId },
    );

    return fileId;
  },
});

export const updateFileStatus = internalMutation({
  args: {
    fileId: v.id("customerFiles"),
    status: v.string(),
    error: v.optional(v.string()),
    ragEntryId: v.optional(v.string()),
    extractionMethod: v.optional(v.string()),
    extractedCharCount: v.optional(v.number()),
    pageCount: v.optional(v.number()),
    extractionWarning: v.optional(v.string()),
  },
  handler: async (
    ctx,
    {
      fileId,
      status,
      error,
      ragEntryId,
      extractionMethod,
      extractedCharCount,
      pageCount,
      extractionWarning,
    },
  ) => {
    const patch: Record<string, unknown> = { status };
    if (error !== undefined) patch.error = error;
    if (ragEntryId !== undefined) patch.ragEntryId = ragEntryId;
    if (extractionMethod !== undefined)
      patch.extractionMethod = extractionMethod;
    if (extractedCharCount !== undefined)
      patch.extractedCharCount = extractedCharCount;
    if (pageCount !== undefined) patch.pageCount = pageCount;
    if (extractionWarning !== undefined)
      patch.extractionWarning = extractionWarning;
    await ctx.db.patch(fileId, patch);
  },
});

export const deleteCustomerFile = mutation({
  args: {
    fileId: v.id("customerFiles"),
  },
  handler: async (ctx, { fileId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const userId = ws.effectiveUserId;

    const file = await ctx.db.get(fileId);
    if (!file || file.userId !== userId) {
      throw new Error("File not found");
    }

    if (file.bunnyPath) {
      await ctx.scheduler.runAfter(
        0,
        internal.bunny.internalActions.deletePath,
        { path: file.bunnyPath },
      );
    }
    await ctx.db.delete(fileId);

    if (file.ragEntryId) {
      await ctx.scheduler.runAfter(
        0,
        internal.customerFiles.actions.deleteFileChunks,
        { ragEntryId: file.ragEntryId },
      );
    }
  },
});
