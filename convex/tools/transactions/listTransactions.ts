import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createListTransactionsTool(customerId?: string) {
  return createTool({
    description:
      "List billing transactions for a customer. Optionally filter by status (pending, paid, overdue, cancelled). Use when the user asks about charges, invoices, payments, or billing history.",
    inputSchema: z.object({
      customerId: customerId
        ? z.string().optional().describe("Customer ID (already set from context)")
        : z.string().describe("The customer ID to list transactions for"),
      status: z
        .enum(["pending", "paid", "overdue", "cancelled"])
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
          internal.serviceTransactions.queries.listByCustomerInternal,
          {
            userId,
            customerId: targetCustomerId,
            status: input.status,
          },
        );

        return {
          success: true,
          count: transactions.length,
          transactions: transactions.map((tx: { _id: string; serviceName: string | null; amount: number; status: string; dueDate: string; paidDate?: string; paymentMethod?: string; reference?: string }) => ({
            id: tx._id,
            serviceName: tx.serviceName,
            amount: tx.amount,
            status: tx.status,
            dueDate: tx.dueDate,
            paidDate: tx.paidDate ?? null,
            paymentMethod: tx.paymentMethod ?? null,
            reference: tx.reference ?? null,
          })),
        };
      } catch (err) {
        console.error("List transactions failed:", err);
        const message = err instanceof Error ? err.message : "Failed to list transactions";
        return { error: true, message };
      }
    },
  });
}
