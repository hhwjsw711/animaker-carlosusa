import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ToolExecutionContext } from "../index";

export function createDeleteServiceTransactionTool(execCtx?: ToolExecutionContext) {
  return createTool({
    description:
      "Delete a service billing transaction. Use when the user wants to remove an incorrect or duplicate transaction. WORKFLOW: Use listTransactions first to find the transactionId.",
    inputSchema: z.object({
      transactionId: z.string().describe("The service transaction ID to delete"),
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
            message: `Are you sure you want to delete service transaction ${input.transactionId}? This action cannot be undone.`,
            toolName: "deleteServiceTransaction",
            params: input,
          };
        }

        await ctx.runMutation(
          internal.serviceTransactions.mutations.deleteTransactionInternal,
          {
            userId,
            transactionId: input.transactionId as Id<"serviceTransactions">,
          },
        );

        return {
          success: true,
          transactionId: input.transactionId,
          message: "Service transaction deleted successfully",
        };
      } catch (err) {
        console.error("Delete service transaction failed:", err);
        const message = err instanceof Error ? err.message : "Failed to delete service transaction";
        return { error: true, message };
      }
    },
  });
}
