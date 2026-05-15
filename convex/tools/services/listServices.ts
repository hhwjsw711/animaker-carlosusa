import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createListServicesTool() {
  return createTool({
    description:
      "List or search the user's services. Use when the user asks to see their services, find a service by name, or look up service details. Pass a search term to filter by name, description, or category.",
    inputSchema: z.object({
      search: z
        .string()
        .optional()
        .describe("Optional search term to filter services by name, description, or category"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const services = input.search
          ? await ctx.runQuery(
              internal.services.queries.searchServicesInternal,
              { userId, search: input.search },
            )
          : await ctx.runQuery(
              internal.services.queries.listServicesInternal,
              { userId },
            );

        if (services.length === 0) {
          return {
            found: false,
            message: input.search
              ? "No services found matching your search."
              : "No services yet.",
          };
        }

        return {
          found: true,
          count: services.length,
          services: services.map((s: { _id: string; name: string; description?: string; category?: string | null; price: number; currency: string; billingType: string; recurringInterval?: string; duration?: string; status: string }) => ({
            id: s._id as string,
            name: s.name,
            description: s.description ?? null,
            category: s.category ?? null,
            price: s.price,
            currency: s.currency,
            billingType: s.billingType,
            recurringInterval: s.recurringInterval ?? null,
            duration: s.duration ?? null,
            status: s.status,
          })),
        };
      } catch (err) {
        console.error("List services failed:", err);
        return { error: true, message: "Failed to list services." };
      }
    },
  });
}
