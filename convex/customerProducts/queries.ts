import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";
import { publicUrl } from "../bunny/url";

export const listByCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];
    const userId = ws.effectiveUserId;

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== userId) return [];

    const assignments = await ctx.db
      .query("customerProducts")
      .withIndex("by_userId_and_customerId", (q) =>
        q.eq("userId", userId).eq("customerId", customerId),
      )
      .take(200);

    const results = [];
    for (const a of assignments) {
      const product = await ctx.db.get(a.productId);
      const firstBunnyPath = product?.photoBunnyPaths?.[0];
      const firstPhotoUrl = firstBunnyPath
        ? publicUrl(firstBunnyPath, { width: 600, format: "webp" })
        : null;
      results.push({
        ...a,
        productName: product?.name ?? null,
        productPrice: product?.price ?? 0,
        productCurrency: product?.currency ?? "BRL",
        productSku: product?.sku ?? null,
        productStatus: product?.status ?? "inactive",
        productPhotoUrl: firstPhotoUrl,
      });
    }

    return results;
  },
});

export const listByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];
    const userId = ws.effectiveUserId;

    const product = await ctx.db.get(productId);
    if (!product || product.userId !== userId) return [];

    const assignments = await ctx.db
      .query("customerProducts")
      .withIndex("by_userId_and_productId", (q) =>
        q.eq("userId", userId).eq("productId", productId),
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
      .query("customerProducts")
      .withIndex("by_userId_and_customerId", (q) =>
        q.eq("userId", userId).eq("customerId", customerId),
      )
      .take(100);

    const results = [];
    for (const a of assignments) {
      const product = await ctx.db.get(a.productId);
      results.push({
        _id: a._id,
        productId: a.productId,
        productName: product?.name ?? null,
        price: a.customPrice ?? product?.price ?? 0,
        currency: product?.currency ?? "BRL",
        sku: product?.sku ?? null,
        status: a.status,
        notes: a.notes,
      });
    }

    return results;
  },
});

export const listByProductInternal = internalQuery({
  args: { userId: v.id("users"), productId: v.id("products") },
  handler: async (ctx, { userId, productId }) => {
    const product = await ctx.db.get(productId);
    const assignments = await ctx.db
      .query("customerProducts")
      .withIndex("by_userId_and_productId", (q) =>
        q.eq("userId", userId).eq("productId", productId),
      )
      .take(100);

    const results = [];
    for (const a of assignments) {
      const customer = await ctx.db.get(a.customerId);
      results.push({
        _id: a._id,
        customerId: a.customerId,
        customerName: customer?.name ?? null,
        price: a.customPrice ?? product?.price ?? 0,
        currency: product?.currency ?? "BRL",
        status: a.status,
      });
    }

    return results;
  },
});
