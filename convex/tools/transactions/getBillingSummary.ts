import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createGetBillingSummaryTool(customerId?: string) {
  return createTool({
    description:
      "Get a billing/financial summary for a customer, including total outstanding, overdue, and paid amounts. Use when the user asks about a customer's financial status, billing overview, or payment summary.",
    inputSchema: z.object({
      customerId: customerId
        ? z.string().optional().describe("Customer ID (already set from context)")
        : z.string().describe("The customer ID to get the billing summary for"),
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
          internal.serviceTransactions.queries.getBillingSummaryInternal,
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
          totalOutstanding: summary.totalOutstanding,
          totalOverdue: summary.totalOverdue,
          totalPaidThisMonth: summary.totalPaidThisMonth,
          countPending: summary.countPending,
          countOverdue: summary.countOverdue,
          countPaid: summary.countPaid,
        };
      } catch (err) {
        console.error("Get billing summary failed:", err);
        const message = err instanceof Error ? err.message : "Failed to get billing summary";
        return { error: true, message };
      }
    },
  });
}
