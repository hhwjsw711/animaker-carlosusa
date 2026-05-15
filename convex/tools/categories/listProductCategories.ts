import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createListProductCategoriesTool() {
  return createTool({
    description:
      "List all product categories. Use when the user asks about product categories, wants to see available categories, or before creating/updating a product with a category.",
    inputSchema: z.object({}),
    execute: async (ctx) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const categories = await ctx.runQuery(
          internal.productCategories.queries.listCategoriesInternal,
          { userId },
        );

        if (categories.length === 0) {
          return { found: false, message: "No product categories yet." };
        }

        return {
          found: true,
          count: categories.length,
          categories: categories.map((c: { _id: string; name: string; color: string }) => ({
            id: c._id as string,
            name: c.name,
            color: c.color,
          })),
        };
      } catch (err) {
        console.error("List product categories failed:", err);
        return { error: true, message: "Failed to list product categories." };
      }
    },
  });
}
