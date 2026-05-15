import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";
import { paginationOptsValidator } from "convex/server";
import { publicUrl } from "../bunny/url";

export const listProducts = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return { page: [], isDone: true, continueCursor: "" };
    const userId = ws.effectiveUserId;

    const result = await ctx.db
      .query("products")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (product) => {
        const photoUrls = (product.photoBunnyPaths ?? []).map((p) =>
          publicUrl(p, { width: 600, format: "webp" }),
        );
        return { ...product, photoUrls };
      }),
    );

    return { ...result, page };
  },
});

export const getProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;
    const userId = ws.effectiveUserId;

    const product = await ctx.db.get(productId);
    if (!product || product.userId !== userId) return null;

    let categoryName: string | undefined;
    if (product.categoryId) {
      const category = await ctx.db.get(product.categoryId);
      categoryName = category?.name;
    }

    const photoUrls = (product.photoBunnyPaths ?? []).map((p) =>
      publicUrl(p, { width: 1200, format: "webp" }),
    );

    return { ...product, categoryName, photoUrls };
  },
});

export const listActiveProductsLight = query({
  args: {},
  handler: async (ctx) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];
    const userId = ws.effectiveUserId;

    const products = await ctx.db
      .query("products")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", userId).eq("status", "active"),
      )
      .take(500);

    return products.map((p) => ({ _id: p._id, name: p.name }));
  },
});

// ─── Internal (for AI agent) ──────────────────────────────────────────────────

export const getProductInternal = internalQuery({
  args: { userId: v.id("users"), productId: v.id("products") },
  handler: async (ctx, { userId, productId }) => {
    const product = await ctx.db.get(productId);
    if (!product || product.userId !== userId) return null;

    let categoryName: string | null = null;
    if (product.categoryId) {
      const category = await ctx.db.get(product.categoryId);
      categoryName = category?.name ?? null;
    }

    return {
      _id: product._id,
      name: product.name,
      description: product.description,
      category: categoryName,
      sku: product.sku,
      price: product.price,
      currency: product.currency,
      photoCount: (product.photoBunnyPaths ?? []).length,
      status: product.status,
    };
  },
});

export const listProductsInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);

    const categories = await ctx.db
      .query("productCategories")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);

    const categoryMap = new Map(categories.map((c) => [c._id, c.name]));

    return products.map((p) => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      category: p.categoryId ? categoryMap.get(p.categoryId) ?? null : null,
      sku: p.sku,
      price: p.price,
      currency: p.currency,
      photoCount: (p.photoBunnyPaths ?? []).length,
      status: p.status,
    }));
  },
});

export const searchProductsInternal = internalQuery({
  args: { userId: v.id("users"), search: v.string() },
  handler: async (ctx, { userId, search }) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);

    const categories = await ctx.db
      .query("productCategories")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(100);

    const categoryMap = new Map(categories.map((c) => [c._id, c.name]));

    const term = search.toLowerCase().trim();
    const mapProduct = (p: (typeof products)[number]) => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      category: p.categoryId ? categoryMap.get(p.categoryId) ?? null : null,
      sku: p.sku,
      price: p.price,
      currency: p.currency,
      photoCount: (p.photoBunnyPaths ?? []).length,
      status: p.status,
    });

    if (!term) return products.map(mapProduct);

    return products
      .filter((p) => {
        const catName = p.categoryId ? categoryMap.get(p.categoryId) : null;
        return (
          p.name.toLowerCase().includes(term) ||
          (p.description?.toLowerCase().includes(term) ?? false) ||
          (p.sku?.toLowerCase().includes(term) ?? false) ||
          (catName?.toLowerCase().includes(term) ?? false)
        );
      })
      .map(mapProduct);
  },
});

// ─── RAG ─────────────────────────────────────────────────────────────────────

export const getProductForRag = internalQuery({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const product = await ctx.db.get(productId);
    if (!product) return null;

    let categoryName: string | null = null;
    if (product.categoryId) {
      const category = await ctx.db.get(product.categoryId);
      categoryName = category?.name ?? null;
    }

    return {
      userId: product.userId,
      name: product.name,
      description: product.description,
      categoryName,
      sku: product.sku,
      price: product.price,
      currency: product.currency,
      status: product.status,
    };
  },
});

export const listProductsWithoutRag = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("products").take(1000);
    return all.filter((p) => !p.ragEntryId).map((p) => p._id);
  },
});
