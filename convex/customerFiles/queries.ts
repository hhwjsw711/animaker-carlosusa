import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";
import { signedUrl } from "../bunny/url";

export const listCustomerFiles = query({
  args: {
    customerId: v.id("customers"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { customerId, paginationOpts }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const userId = ws.effectiveUserId;

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== userId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.db
      .query("customerFiles")
      .withIndex("by_customerId_and_createdAt", (q) =>
        q.eq("customerId", customerId),
      )
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const getFileDownloadUrl = query({
  args: {
    fileId: v.id("customerFiles"),
  },
  handler: async (ctx, { fileId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;
    const userId = ws.effectiveUserId;

    const file = await ctx.db.get(fileId);
    if (!file || file.userId !== userId) return null;
    if (file.status !== "ready") return null;

    if (!file.bunnyPath) return null;
    const url = await signedUrl(file.bunnyPath, { ttlSeconds: 60 * 60 });

    return { url, name: file.name, type: file.type };
  },
});

export const listCustomerFileNames = internalQuery({
  args: {
    customerId: v.id("customers"),
  },
  handler: async (ctx, { customerId }) => {
    const files = await ctx.db
      .query("customerFiles")
      .withIndex("by_customerId_and_createdAt", (q) =>
        q.eq("customerId", customerId),
      )
      .order("desc")
      .take(500);

    return files.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      category: f.category,
      status: f.status,
      createdAt: f.createdAt,
      extractionMethod: f.extractionMethod,
      extractedCharCount: f.extractedCharCount,
      extractionWarning: f.extractionWarning,
    }));
  },
});

export const getCustomerFile = internalQuery({
  args: {
    fileId: v.id("customerFiles"),
  },
  handler: async (ctx, { fileId }) => {
    return await ctx.db.get(fileId);
  },
});
