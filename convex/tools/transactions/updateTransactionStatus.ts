import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createUpdateTransactionStatusTool() {
  return createTool({
    description:
      "Update the status of a billing transaction. Use to mark a transaction as paid, overdue, or cancelled. When marking as paid, optionally provide the payment date and method. WORKFLOW: Use listTransactions first to find the transactionId.",
    inputSchema: z.object({
      transactionId: z.string().describe("The transaction ID to update"),
      status: z
        .enum(["paid", "overdue", "cancelled"])
        .describe("The new status for the transaction"),
      paidDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Payment date in YYYY-MM-DD format (optional, defaults to today when marking as paid)"),
      paymentMethod: z
        .enum(["pix", "cash", "credit_card", "bank_transfer", "boleto", "other"])
        .optional()
        .describe("Payment method (optional)"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        await ctx.runMutation(
          internal.serviceTransactions.mutations.updateTransactionInternal,
          {
            userId,
            transactionId: input.transactionId as Id<"serviceTransactions">,
            status: input.status,
            paidDate: input.paidDate,
            paymentMethod: input.paymentMethod,
          },
        );

        return {
          success: true,
          transactionId: input.transactionId,
          newStatus: input.status,
        };
      } catch (err) {
        console.error("Update transaction status failed:", err);
        const message = err instanceof Error ? err.message : "Failed to update transaction";
        return { error: true, message };
      }
    },
  });
}
