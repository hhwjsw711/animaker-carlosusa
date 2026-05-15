import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createAssignServiceToCustomerTool(customerId?: string) {
  return createTool({
    description:
      "Assign a service to a customer, creating an active service subscription/assignment. Use when the user wants to link a service to a customer or start a service for a customer. WORKFLOW: Use listServices first to find the serviceId. NEVER guess or fabricate IDs.",
    inputSchema: z.object({
      serviceId: z.string().describe("The service ID to assign"),
      customerId: customerId
        ? z.string().optional().describe("Customer ID (already set from context)")
        : z.string().describe("The customer ID to assign the service to"),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Start date in YYYY-MM-DD format"),
      customPrice: z
        .number()
        .min(0)
        .optional()
        .describe("Custom price override in cents (optional, uses service base price if omitted)"),
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
          internal.customerServices.mutations.assignServiceInternal,
          {
            userId,
            customerId: targetCustomerId,
            serviceId: input.serviceId as Id<"services">,
            startDate: input.startDate,
            customPrice: input.customPrice,
            notes: input.notes,
          },
        );

        return {
          success: true,
          assignmentId: assignmentId as string,
          serviceId: input.serviceId,
          customerId: targetCustomerId as string,
          startDate: input.startDate,
        };
      } catch (err) {
        console.error("Assign service failed:", err);
        const message = err instanceof Error ? err.message : "Failed to assign service";
        return { error: true, message };
      }
    },
  });
}
