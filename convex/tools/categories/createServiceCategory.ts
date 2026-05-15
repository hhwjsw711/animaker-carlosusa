import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createCreateServiceCategoryTool() {
  return createTool({
    description:
      "Create a new service category. Use when the user wants to add or create a new category for services.",
    inputSchema: z.object({
      name: z.string().min(1).max(100).describe("Category name"),
      color: z
        .enum(["red", "orange", "amber", "green", "blue", "violet", "pink", "gray"])
        .describe("Category color"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const categoryId = await ctx.runMutation(
          internal.serviceCategories.mutations.createCategoryInternal,
          {
            userId,
            name: input.name,
            color: input.color,
          },
        );

        return {
          success: true,
          categoryId: categoryId as string,
          name: input.name.trim(),
          color: input.color,
        };
      } catch (err) {
        console.error("Create service category failed:", err);
        const message = err instanceof Error ? err.message : "Failed to create service category";
        return { error: true, message };
      }
    },
  });
}
