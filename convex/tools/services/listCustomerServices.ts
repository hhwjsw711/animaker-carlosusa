import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createListCustomerServicesTool(customerId?: string) {
  return createTool({
    description:
      "List all services assigned to a customer. Use when the user asks about a customer's services, subscriptions, or active service plans.",
    inputSchema: z.object({
      customerId: customerId
        ? z.string().optional().describe("Customer ID (already set from context)")
        : z.string().describe("The customer ID to list services for"),
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
          internal.customerServices.queries.listByCustomerInternal,
          { userId, customerId: targetCustomerId },
        );

        if (assignments.length === 0) {
          return {
            found: false,
            message: "No services assigned to this customer.",
          };
        }

        return {
          found: true,
          count: assignments.length,
          services: assignments.map((a: { _id: string; serviceId: string; serviceName: string | null; price: number; currency: string; billingType: string; status: string; startDate: string; endDate?: string; nextBillingDate?: string; notes?: string }) => ({
            assignmentId: a._id as string,
            serviceId: a.serviceId as string,
            serviceName: a.serviceName,
            price: a.price,
            currency: a.currency,
            billingType: a.billingType,
            status: a.status,
            startDate: a.startDate,
            endDate: a.endDate ?? null,
            nextBillingDate: a.nextBillingDate ?? null,
            notes: a.notes ?? null,
          })),
        };
      } catch (err) {
        console.error("List customer services failed:", err);
        return { error: true, message: "Failed to list customer services." };
      }
    },
  });
}
