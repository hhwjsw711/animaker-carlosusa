import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createListProductsTool() {
  return createTool({
    description:
      "List or search the user's products. Use when the user asks to see their products, find a product by name, or look up product details. Pass a search term to filter by name, description, or category.",
    inputSchema: z.object({
      search: z
        .string()
        .optional()
        .describe("Optional search term to filter products by name, description, or category"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const products = input.search
          ? await ctx.runQuery(
              internal.products.queries.searchProductsInternal,
              { userId, search: input.search },
            )
          : await ctx.runQuery(
              internal.products.queries.listProductsInternal,
              { userId },
            );

        if (products.length === 0) {
          return {
            found: false,
            message: input.search
              ? "No products found matching your search."
              : "No products yet.",
          };
        }

        return {
          found: true,
          count: products.length,
          products: products.map((p: { _id: string; name: string; description?: string; category?: string | null; sku?: string; price: number; currency: string; photoCount: number; status: string }) => ({
            id: p._id as string,
            name: p.name,
            description: p.description ?? null,
            category: p.category ?? null,
            sku: p.sku ?? null,
            price: p.price,
            currency: p.currency,
            photoCount: p.photoCount ?? 0,
            status: p.status,
          })),
        };
      } catch (err) {
        console.error("List products failed:", err);
        return { error: true, message: "Failed to list products." };
      }
    },
  });
}
