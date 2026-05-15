import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createGetServiceTool() {
  return createTool({
    description:
      "Get full details of a specific service by ID. Use after listing services to get complete information about a particular service.",
    inputSchema: z.object({
      serviceId: z.string().describe("The service ID to retrieve"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const service = await ctx.runQuery(
          internal.services.queries.getServiceInternal,
          { userId, serviceId: input.serviceId as Id<"services"> },
        );

        if (!service) {
          return { error: true, message: "Service not found." };
        }

        return {
          found: true,
          service: {
            id: service._id as string,
            name: service.name,
            description: service.description ?? null,
            category: service.category ?? null,
            price: service.price,
            currency: service.currency,
            billingType: service.billingType,
            recurringInterval: service.recurringInterval ?? null,
            duration: service.duration ?? null,
            status: service.status,
          },
        };
      } catch (err) {
        console.error("Get service failed:", err);
        return { error: true, message: "Failed to get service details." };
      }
    },
  });
}
