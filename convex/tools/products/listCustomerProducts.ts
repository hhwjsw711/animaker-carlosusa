import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createListCustomerProductsTool(customerId?: string) {
  return createTool({
    description:
      "List all products assigned to a customer. Use when the user asks about a customer's products or active product assignments.",
    inputSchema: z.object({
      customerId: customerId
        ? z.string().optional().describe("Customer ID (already set from context)")
        : z.string().describe("The customer ID to list products for"),
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

        const assignments = await ctx.runQuery(
          internal.customerProducts.queries.listByCustomerInternal,
          { userId, customerId: targetCustomerId },
        );

        if (assignments.length === 0) {
          return {
            found: false,
            message: "No products assigned to this customer.",
          };
        }

        return {
          found: true,
          count: assignments.length,
          products: assignments.map((a: { _id: string; productId: string; productName: string | null; price: number; currency: string; sku: string | null; status: string; notes?: string }) => ({
            assignmentId: a._id as string,
            productId: a.productId as string,
            productName: a.productName,
            price: a.price,
            currency: a.currency,
            sku: a.sku ?? null,
            status: a.status,
            notes: a.notes ?? null,
          })),
        };
      } catch (err) {
        console.error("List customer products failed:", err);
        return { error: true, message: "Failed to list customer products." };
      }
    },
  });
}
