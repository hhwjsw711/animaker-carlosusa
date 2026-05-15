import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ToolExecutionContext } from "../index";

export function createDeleteProductTransactionTool(execCtx?: ToolExecutionContext) {
  return createTool({
    description:
      "Delete a product transaction. Use when the user wants to remove an incorrect or duplicate product purchase transaction. WORKFLOW: Use listProductTransactions first to find the transactionId.",
    inputSchema: z.object({
      transactionId: z.string().describe("The product transaction ID to delete"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        if (execCtx?.mode === "interactive") {
          return {
            requiresConfirmation: true,
            message: `Are you sure you want to delete product transaction ${input.transactionId}? This action cannot be undone.`,
            toolName: "deleteProductTransaction",
            params: input,
          };
        }

        await ctx.runMutation(
          internal.productTransactions.mutations.deleteTransactionInternal,
          {
            userId,
            transactionId: input.transactionId as Id<"productTransactions">,
          },
        );

        return {
          success: true,
          transactionId: input.transactionId,
          message: "Product transaction deleted successfully",
        };
      } catch (err) {
        console.error("Delete product transaction failed:", err);
        const message = err instanceof Error ? err.message : "Failed to delete product transaction";
        return { error: true, message };
      }
    },
  });
}
