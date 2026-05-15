import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { rag, type EntryId } from "../rag/setup";

function formatPrice(cents: number, currency: string): string {
  const value = (cents / 100).toFixed(2);
  return `${value} ${currency}`;
}

export const indexProductRag = internalAction({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const product = await ctx.runQuery(
      internal.products.queries.getProductForRag,
      { productId },
    );
    if (!product) return;

    const parts = [`Product: ${product.name}.`];
    if (product.description) parts.push(`Description: ${product.description}.`);
    if (product.categoryName) parts.push(`Category: ${product.categoryName}.`);
    if (product.sku) parts.push(`SKU: ${product.sku}.`);
    if (product.price > 0) parts.push(`Price: ${formatPrice(product.price, product.currency)}.`);
    parts.push(`Status: ${product.status}.`);

    const text = parts.join(" ");

    const { entryId } = await rag.add(ctx, {
      namespace: `products:${product.userId}`,
      key: `product:${productId}`,
      title: `[Product: ${product.name}]`,
      text,
    });

    const estimatedTokens = Math.ceil(text.length / 4);
    await ctx.runMutation(internal.usage.mutations.trackUsage, {
      userId: product.userId,
      source: "rag",
      ragOperation: "insert",
      estimatedTokens,
    });

    await ctx.runMutation(internal.products.mutations.updateProductRagEntryId, {
      productId,
      ragEntryId: entryId,
    });
  },
});

export const deleteProductRag = internalAction({
  args: { ragEntryId: v.string() },
  handler: async (ctx, { ragEntryId }) => {
    try {
      await rag.delete(ctx, { entryId: ragEntryId as EntryId });
    } catch {
      // Entry may already be deleted
    }
  },
});
