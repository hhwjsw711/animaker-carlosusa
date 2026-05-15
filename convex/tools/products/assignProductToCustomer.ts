import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createAssignProductToCustomerTool(customerId?: string) {
  return createTool({
    description:
      "Assign a product to a customer, creating an active product assignment. Use when the user wants to link a product to a customer or register a product for a customer. WORKFLOW: Use listProducts first to find the productId. NEVER guess or fabricate IDs.",
    inputSchema: z.object({
      productId: z.string().describe("The product ID to assign"),
      customerId: customerId
        ? z.string().optional().describe("Customer ID (already set from context)")
        : z.string().describe("The customer ID to assign the product to"),
      customPrice: z
        .number()
        .min(0)
        .optional()
        .describe("Custom price override in cents (optional, uses product base price if omitted)"),
      notes: z.string().optional().describe("Optional notes about this assignment"),
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

        const assignmentId = await ctx.runMutation(
          internal.customerProducts.mutations.assignProductInternal,
          {
            userId,
            customerId: targetCustomerId,
            productId: input.productId as Id<"products">,
            customPrice: input.customPrice,
            notes: input.notes,
          },
        );

        return {
          success: true,
          assignmentId: assignmentId as string,
          productId: input.productId,
          customerId: targetCustomerId as string,
        };
      } catch (err) {
        console.error("Assign product failed:", err);
        const message = err instanceof Error ? err.message : "Failed to assign product";
        return { error: true, message };
      }
    },
  });
}
