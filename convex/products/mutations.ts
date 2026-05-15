import { v } from "convex/values";
import { action, mutation, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { resolveWorkspaceUserId, assertNotStaff } from "../lib/workspace";
import { assertPlanLimit } from "../billing/guards";
import { assertBunnyPathPrefix, IMAGE_ONLY } from "../bunny/validate";
import { uploadToBunny } from "../bunny/upload";

const MAX_PHOTOS = 10;

const statusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
);

export const createProduct = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
    sku: v.optional(v.string()),
    price: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const trimmed = args.name.trim();
    if (!trimmed) throw new Error("Name is required");
    if (args.price < 0) throw new Error("Price must be >= 0");

    await assertPlanLimit(ctx, effectiveUserId, "products");

    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category || category.userId !== effectiveUserId) {
        throw new Error("Category not found");
      }
    }

    const productId = await ctx.db.insert("products", {
      userId: effectiveUserId,
      name: trimmed,
      description: args.description?.trim() || undefined,
      categoryId: args.categoryId,
      sku: args.sku?.trim() || undefined,
      price: args.price,
      currency: args.currency,
      status: "active",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.products.actions.indexProductRag, { productId });
    return productId;
  },
});

export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
    removeCategoryId: v.optional(v.boolean()),
    sku: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, { productId, removeCategoryId, ...fields }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const product = await ctx.db.get(productId);
    if (!product || product.userId !== effectiveUserId) {
      throw new Error("Product not found");
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

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(productId, patch);

    // Re-index only if content fields changed (not just status)
    const contentFields = ["name", "description", "categoryId", "sku", "price", "currency"];
    const hasContentChange = contentFields.some((f) => f in patch) || removeCategoryId;
    if (hasContentChange) {
      await ctx.scheduler.runAfter(0, internal.products.actions.indexProductRag, { productId });
    }
  },
});

export const uploadProductPhoto = action({
  args: {
    productId: v.id("products"),
    bytes: v.bytes(),
    contentType: v.string(),
  },
  returns: v.object({ bunnyPath: v.string() }),
  handler: async (ctx, { productId, bytes, contentType }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.runMutation(internal.rateLimit.mutations.checkUploadRateLimit, {
      userId,
    });

    const result = await uploadToBunny({
      bytes,
      contentType,
      size: bytes.byteLength,
      folder: `products/${productId}`,
      allowedCategories: IMAGE_ONLY,
    });

    return { bunnyPath: result.path };
  },
});

export const addProductPhoto = mutation({
  args: {
    productId: v.id("products"),
    bunnyPath: v.string(),
  },
  handler: async (ctx, { productId, bunnyPath }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const product = await ctx.db.get(productId);
    if (!product || product.userId !== effectiveUserId) {
      throw new Error("Product not found");
    }
    assertBunnyPathPrefix(bunnyPath, `products/${productId}`);

    const bunnyPaths = product.photoBunnyPaths ?? [];
    if (bunnyPaths.length >= MAX_PHOTOS) {
      throw new Error("Maximum photos reached");
    }

    await ctx.db.patch(productId, {
      photoBunnyPaths: [...bunnyPaths, bunnyPath],
    });
  },
});

export const removeProductPhoto = mutation({
  args: {
    productId: v.id("products"),
    bunnyPath: v.string(),
  },
  handler: async (ctx, { productId, bunnyPath }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const product = await ctx.db.get(productId);
    if (!product || product.userId !== effectiveUserId) {
      throw new Error("Product not found");
    }
    assertBunnyPathPrefix(bunnyPath, `products/${productId}`);

    const bunnyPaths = product.photoBunnyPaths ?? [];
    await ctx.db.patch(productId, {
      photoBunnyPaths: bunnyPaths.filter((p) => p !== bunnyPath),
    });
    await ctx.scheduler.runAfter(
      0,
      internal.bunny.internalActions.deletePath,
      { path: bunnyPath },
    );
  },
});

export const reorderProductPhotos = mutation({
  args: {
    productId: v.id("products"),
    photoBunnyPaths: v.array(v.string()),
  },
  handler: async (ctx, { productId, photoBunnyPaths }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const product = await ctx.db.get(productId);
    if (!product || product.userId !== effectiveUserId) {
      throw new Error("Product not found");
    }

    const current = new Set(product.photoBunnyPaths ?? []);
    const incoming = new Set(photoBunnyPaths);
    if (
      current.size !== incoming.size ||
      ![...current].every((p) => incoming.has(p))
    ) {
      throw new Error("Photo paths mismatch");
    }

    await ctx.db.patch(productId, { photoBunnyPaths });
  },
});

export const deleteProduct = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, { productId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const product = await ctx.db.get(productId);
    if (!product || product.userId !== effectiveUserId) {
      throw new Error("Product not found");
    }

    // Cascade delete customerProducts and productTransactions
    const assignments = await ctx.db
      .query("customerProducts")
      .withIndex("by_userId_and_productId", (q) =>
        q.eq("userId", effectiveUserId).eq("productId", productId),
      )
      .take(500);

    for (const assignment of assignments) {
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

    if (product.photoBunnyPaths && product.photoBunnyPaths.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.bunny.internalActions.deletePaths,
        { paths: product.photoBunnyPaths },
      );
    }

    if (product.ragEntryId) {
      await ctx.scheduler.runAfter(0, internal.products.actions.deleteProductRag, { ragEntryId: product.ragEntryId });
    }

    await ctx.db.delete(productId);
  },
});

// ─── Internal (for AI agent) ────────────────────────────────────���─────────────

export const createProductInternal = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
    sku: v.optional(v.string()),
    price: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, { userId, ...args }) => {
    const trimmed = args.name.trim();
    if (!trimmed) throw new Error("Name is required");
    if (args.price < 0) throw new Error("Price must be >= 0");

    await assertPlanLimit(ctx, userId, "products");

    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category || category.userId !== userId) {
        throw new Error("Category not found");
      }
    }

    const productId = await ctx.db.insert("products", {
      userId,
      name: trimmed,
      description: args.description?.trim() || undefined,
      categoryId: args.categoryId,
      sku: args.sku?.trim() || undefined,
      price: args.price,
      currency: args.currency,
      status: "active",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.products.actions.indexProductRag, { productId });
    return productId;
  },
});

export const updateProductInternal = internalMutation({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("productCategories")),
    removeCategoryId: v.optional(v.boolean()),
    sku: v.optional(v.string()),
    price: v.optional(v.number()),
    currency: v.optional(v.string()),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, { userId, productId, removeCategoryId, ...fields }) => {
    const product = await ctx.db.get(productId);
    if (!product || product.userId !== userId) {
      throw new Error("Product not found");
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

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(productId, patch);

    const contentFields = ["name", "description", "categoryId", "sku", "price", "currency"];
    const hasContentChange = contentFields.some((f) => f in patch) || removeCategoryId;
    if (hasContentChange) {
      await ctx.scheduler.runAfter(0, internal.products.actions.indexProductRag, { productId });
    }
  },
});

export const deleteProductInternal = internalMutation({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
  },
  handler: async (ctx, { userId, productId }) => {
    const product = await ctx.db.get(productId);
    if (!product || product.userId !== userId) {
      throw new Error("Product not found");
    }

    const assignments = await ctx.db
      .query("customerProducts")
      .withIndex("by_userId_and_productId", (q) =>
        q.eq("userId", userId).eq("productId", productId),
      )
      .take(500);

    for (const assignment of assignments) {
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

    if (product.photoBunnyPaths && product.photoBunnyPaths.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.bunny.internalActions.deletePaths,
        { paths: product.photoBunnyPaths },
      );
    }

    if (product.ragEntryId) {
      await ctx.scheduler.runAfter(0, internal.products.actions.deleteProductRag, { ragEntryId: product.ragEntryId });
    }

    await ctx.db.delete(productId);
  },
});

export const addProductPhotoInternal = internalMutation({
  args: {
    userId: v.id("users"),
    productId: v.id("products"),
    bunnyPath: v.string(),
  },
  handler: async (ctx, { userId, productId, bunnyPath }) => {
    const product = await ctx.db.get(productId);
    if (!product || product.userId !== userId) {
      throw new Error("Product not found");
    }
    assertBunnyPathPrefix(bunnyPath, `products/${productId}`);
    const bunnyPaths = product.photoBunnyPaths ?? [];
    if (bunnyPaths.length >= MAX_PHOTOS) {
      throw new Error("Maximum photos reached");
    }
    await ctx.db.patch(productId, {
      photoBunnyPaths: [...bunnyPaths, bunnyPath],
    });
  },
});

// ─── RAG ─────────────────────────────────────────────────────────────────────

export const updateProductRagEntryId = internalMutation({
  args: {
    productId: v.id("products"),
    ragEntryId: v.string(),
  },
  handler: async (ctx, { productId, ragEntryId }) => {
    const product = await ctx.db.get(productId);
    if (!product) return;
    await ctx.db.patch(productId, { ragEntryId });
  },
});
