import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createCreateProductTransactionTool(customerId?: string) {
  return createTool({
    description:
      "Create a purchase/transaction for a customer's product assignment. Use when the user wants to register a product sale, purchase, or payment entry for a customer.",
    inputSchema: z.object({
      customerProductId: z
        .string()
        .describe("The customer-product assignment ID to create the transaction for"),
      quantity: z
        .number()
        .min(1)
        .describe("Quantity purchased (must be >= 1)"),
      unitPrice: z
        .number()
        .min(0)
        .describe("Unit price in cents (e.g. 5000 = $50.00)"),
      purchaseDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Purchase date in YYYY-MM-DD format"),
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
          internal.productTransactions.mutations.createTransactionInternal,
          {
            userId,
            customerProductId: input.customerProductId as Id<"customerProducts">,
            quantity: input.quantity,
            unitPrice: input.unitPrice,
            purchaseDate: input.purchaseDate,
            status: "pending",
            paymentMethod: input.paymentMethod,
            reference: input.reference,
            notes: input.notes,
          },
        );

        return {
          success: true,
          transactionId: transactionId as string,
          amount: Math.round(input.quantity * input.unitPrice),
          quantity: input.quantity,
          purchaseDate: input.purchaseDate,
        };
      } catch (err) {
        console.error("Create product transaction failed:", err);
        const message = err instanceof Error ? err.message : "Failed to create product transaction";
        return { error: true, message };
      }
    },
  });
}
