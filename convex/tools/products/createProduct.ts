import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createCreateProductTool() {
  return createTool({
    description:
      "Create a new product in the catalog with name, price, currency, and optional details. Use when the user asks to add, register, or create a new product.",
    inputSchema: z.object({
      name: z.string().min(1).max(255).describe("Product name"),
      description: z.string().optional().describe("Product description"),
      categoryId: z.string().optional().describe("Product category ID (use listProductCategories to find available categories)"),
      sku: z.string().optional().describe("Product SKU code"),
      price: z.number().min(0).describe("Price in cents (e.g. 5000 = $50.00 or R$50,00)"),
      currency: z.string().default("BRL").describe("Currency code: BRL, USD, EUR, etc."),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        // Validate categoryId exists before passing to mutation
        if (input.categoryId) {
          const category = await ctx.runQuery(
            internal.productCategories.queries.getCategoryInternal,
            { categoryId: input.categoryId as Id<"productCategories"> },
          );
          if (!category) {
            return { error: true, message: `Category not found. Use listProductCategories to get valid category IDs.` };
          }
        }

        const productId = await ctx.runMutation(
          internal.products.mutations.createProductInternal,
          {
            userId,
            name: input.name,
            description: input.description,
            categoryId: input.categoryId as Id<"productCategories"> | undefined,
            sku: input.sku,
            price: input.price,
            currency: input.currency,
          },
        );

        return {
          success: true,
          productId: productId as string,
          name: input.name.trim(),
          price: input.price,
          currency: input.currency,
        };
      } catch (err) {
        console.error("Create product failed:", err);
        const message = err instanceof Error ? err.message : "Failed to create product";
        return { error: true, message };
      }
    },
  });
}
