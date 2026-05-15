import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createGetProductTool() {
  return createTool({
    description:
      "Get full details of a specific product by ID. Use after listing products to get complete information about a particular product.",
    inputSchema: z.object({
      productId: z.string().describe("The product ID to retrieve"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const product = await ctx.runQuery(
          internal.products.queries.getProductInternal,
          { userId, productId: input.productId as Id<"products"> },
        );

        if (!product) {
          return { error: true, message: "Product not found." };
        }

        return {
          found: true,
          product: {
            id: product._id as string,
            name: product.name,
            description: product.description ?? null,
            category: product.category ?? null,
            sku: product.sku ?? null,
            price: product.price,
            currency: product.currency,
            photoCount: product.photoCount ?? 0,
            status: product.status,
          },
        };
      } catch (err) {
        console.error("Get product failed:", err);
        return { error: true, message: "Failed to get product details." };
      }
    },
  });
}
