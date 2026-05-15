import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createUpdateProductTransactionStatusTool() {
  return createTool({
    description:
      "Update the status of a product transaction. Use to mark a product transaction as paid or cancelled. When marking as paid, optionally provide the payment date and method.",
    inputSchema: z.object({
      transactionId: z.string().describe("The product transaction ID to update"),
      status: z
        .enum(["paid", "cancelled"])
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
          internal.productTransactions.mutations.updateTransactionInternal,
          {
            userId,
            transactionId: input.transactionId as Id<"productTransactions">,
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
        console.error("Update product transaction status failed:", err);
        const message = err instanceof Error ? err.message : "Failed to update product transaction";
        return { error: true, message };
      }
    },
  });
}
