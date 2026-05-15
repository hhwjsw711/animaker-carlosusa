import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ToolExecutionContext } from "../index";

export function createDeleteProductTool(execCtx?: ToolExecutionContext) {
  return createTool({
    description:
      "Delete a product permanently, including all customer assignments associated with it. " +
      (execCtx?.mode === "scheduled"
        ? "You are running as an automated scheduled task — proceed directly without approval."
        : "ALWAYS confirm with the user first — tell them what will be deleted and ask for explicit approval before calling this tool."),
    inputSchema: z.object({
      productId: z.string().describe("The product ID to delete"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        await ctx.runMutation(
          internal.products.mutations.deleteProductInternal,
          { userId, productId: input.productId as Id<"products"> },
        );

        return { success: true, deleted: true, productId: input.productId };
      } catch (err) {
        console.error("Delete product failed:", err);
        const message = err instanceof Error ? err.message : "Failed to delete product";
        return { error: true, message };
      }
    },
  });
}
