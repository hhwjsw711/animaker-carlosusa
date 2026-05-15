import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createUpdateProductTool() {
  return createTool({
    description:
      "Update a product's fields (name, description, category, sku, price, currency, status). Use when the user asks to modify, change, or update a product.",
    inputSchema: z.object({
      productId: z.string().describe("The product ID to update"),
      name: z.string().min(1).max(255).optional().describe("New product name"),
      description: z.string().optional().describe("New description"),
      categoryId: z.string().optional().describe("New category ID (use listProductCategories to find available categories)"),
      removeCategoryId: z.boolean().optional().describe("Set to true to remove the current category"),
      sku: z.string().optional().describe("New SKU code"),
      price: z.number().min(0).optional().describe("New price in cents"),
      currency: z.string().optional().describe("New currency code"),
      status: z.enum(["active", "inactive"]).optional().describe("New status"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const args: Record<string, unknown> = {
          userId,
          productId: input.productId as Id<"products">,
        };
        if (input.name !== undefined) args.name = input.name;
        if (input.description !== undefined) args.description = input.description;
        if (input.categoryId !== undefined) {
          const category = await ctx.runQuery(
            internal.productCategories.queries.getCategoryInternal,
            { categoryId: input.categoryId as Id<"productCategories"> },
          );
          if (!category) {
            return { error: true, message: `Category not found. Use listProductCategories to get valid category IDs.` };
          }
          args.categoryId = input.categoryId;
        }
        if (input.removeCategoryId !== undefined) args.removeCategoryId = input.removeCategoryId;
        if (input.sku !== undefined) args.sku = input.sku;
        if (input.price !== undefined) args.price = input.price;
        if (input.currency !== undefined) args.currency = input.currency;
        if (input.status !== undefined) args.status = input.status;

        await ctx.runMutation(
          internal.products.mutations.updateProductInternal,
          args as {
            userId: Id<"users">;
            productId: Id<"products">;
            name?: string;
            description?: string;
            categoryId?: Id<"productCategories">;
            removeCategoryId?: boolean;
            sku?: string;
            price?: number;
            currency?: string;
            status?: "active" | "inactive";
          },
        );

        return { success: true, productId: input.productId };
      } catch (err) {
        console.error("Update product failed:", err);
        const message = err instanceof Error ? err.message : "Failed to update product";
        return { error: true, message };
      }
    },
  });
}
