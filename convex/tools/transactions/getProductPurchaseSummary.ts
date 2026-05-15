import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createGetProductPurchaseSummaryTool(customerId?: string) {
  return createTool({
    description:
      "Get a purchase/financial summary for a customer's product transactions, including total pending, paid amounts, and counts. Use when the user asks about a customer's product purchase overview or product payment summary.",
    inputSchema: z.object({
      customerId: customerId
        ? z.string().optional().describe("Customer ID (already set from context)")
        : z.string().describe("The customer ID to get the purchase summary for"),
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

        const summary = await ctx.runQuery(
          internal.productTransactions.queries.getPurchaseSummaryInternal,
          {
            userId,
            customerId: targetCustomerId,
          },
        );

        if (!summary) {
          return { error: true, message: "Customer not found." };
        }

        return {
          success: true,
          totalPending: summary.totalPending,
          totalPaidThisMonth: summary.totalPaidThisMonth,
          countPending: summary.countPending,
          countPaid: summary.countPaid,
        };
      } catch (err) {
        console.error("Get product purchase summary failed:", err);
        const message = err instanceof Error ? err.message : "Failed to get purchase summary";
        return { error: true, message };
      }
    },
  });
}
