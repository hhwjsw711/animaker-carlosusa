import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createListProductTransactionsTool(customerId?: string) {
  return createTool({
    description:
      "List product purchase transactions for a customer. Optionally filter by status (pending, paid, cancelled). Use when the user asks about product purchases, product payments, or product billing history.",
    inputSchema: z.object({
      customerId: customerId
        ? z.string().optional().describe("Customer ID (already set from context)")
        : z.string().describe("The customer ID to list product transactions for"),
      status: z
        .enum(["pending", "paid", "cancelled"])
        .optional()
        .describe("Filter by transaction status (optional)"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;
        const targetCustomerId = (customerId ?? input.customerId) as Id<"customers">;

        if (!targetCustomerId) {
          return { error: true, message: "Customer ID is required." };
        }

        const transactions = await ctx.runQuery(
          internal.productTransactions.queries.listByCustomerInternal,
          {
            userId,
            customerId: targetCustomerId,
            status: input.status,
          },
        );

        return {
          success: true,
          count: transactions.length,
          transactions: transactions.map((tx: { _id: string; productName: string | null; quantity: number; unitPrice: number; amount: number; status: string; purchaseDate: string; paidDate?: string; paymentMethod?: string; reference?: string }) => ({
            id: tx._id,
            productName: tx.productName,
            quantity: tx.quantity,
            unitPrice: tx.unitPrice,
            amount: tx.amount,
            status: tx.status,
            purchaseDate: tx.purchaseDate,
            paidDate: tx.paidDate ?? null,
            paymentMethod: tx.paymentMethod ?? null,
            reference: tx.reference ?? null,
          })),
        };
      } catch (err) {
        console.error("List product transactions failed:", err);
        const message = err instanceof Error ? err.message : "Failed to list product transactions";
        return { error: true, message };
      }
    },
  });
}
