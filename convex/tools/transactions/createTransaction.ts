import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createCreateTransactionTool(customerId?: string) {
  return createTool({
    description:
      "Create a billing transaction/charge for a customer's service assignment. Use when the user wants to register a new charge, invoice, or payment entry for a customer. WORKFLOW: Use listCustomerServices first to find the customerServiceId. Amounts are in cents (e.g. 5000 = $50.00).",
    inputSchema: z.object({
      customerServiceId: z
        .string()
        .describe("The customer service assignment ID to create the transaction for"),
      amount: z
        .number()
        .min(0)
        .describe("Transaction amount in cents (e.g. 5000 = $50.00)"),
      dueDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Due date in YYYY-MM-DD format"),
      paymentMethod: z
        .enum(["pix", "cash", "credit_card", "bank_transfer", "boleto", "other"])
        .optional()
        .describe("Payment method (optional)"),
      reference: z.string().optional().describe("Reference or invoice number (optional)"),
      notes: z.string().optional().describe("Optional notes about this transaction"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const transactionId = await ctx.runMutation(
          internal.serviceTransactions.mutations.createTransactionInternal,
          {
            userId,
            customerServiceId: input.customerServiceId as Id<"customerServices">,
            amount: input.amount,
            dueDate: input.dueDate,
            paymentMethod: input.paymentMethod,
            reference: input.reference,
            notes: input.notes,
          },
        );

        return {
          success: true,
          transactionId: transactionId as string,
          amount: input.amount,
          dueDate: input.dueDate,
        };
      } catch (err) {
        console.error("Create transaction failed:", err);
        const message = err instanceof Error ? err.message : "Failed to create transaction";
        return { error: true, message };
      }
    },
  });
}
