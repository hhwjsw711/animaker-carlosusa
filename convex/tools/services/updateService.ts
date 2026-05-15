import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createUpdateServiceTool() {
  return createTool({
    description:
      "Update a service's fields (name, description, category, price, currency, billingType, recurringInterval, duration, status). Use when the user asks to modify, change, or update a service.",
    inputSchema: z.object({
      serviceId: z.string().describe("The service ID to update"),
      name: z.string().min(1).max(255).optional().describe("New service name"),
      description: z.string().optional().describe("New description"),
      categoryId: z.string().optional().describe("New category ID (use listServiceCategories to find available categories)"),
      removeCategoryId: z.boolean().optional().describe("Set to true to remove the current category"),
      price: z.number().min(0).optional().describe("New price in cents"),
      currency: z.string().optional().describe("New currency code"),
      billingType: z.enum(["one_time", "recurring"]).optional().describe("New billing type"),
      recurringInterval: z
        .enum(["weekly", "biweekly", "monthly", "quarterly", "semiannual", "annual"])
        .optional()
        .describe("New recurring interval"),
      duration: z.string().optional().describe("New duration/unit"),
      status: z.enum(["active", "inactive"]).optional().describe("New status"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const args: Record<string, unknown> = {
          userId,
          serviceId: input.serviceId as Id<"services">,
        };
        if (input.name !== undefined) args.name = input.name;
        if (input.description !== undefined) args.description = input.description;
        if (input.categoryId !== undefined) {
          const category = await ctx.runQuery(
            internal.serviceCategories.queries.getCategoryInternal,
            { categoryId: input.categoryId as Id<"serviceCategories"> },
          );
          if (!category) {
            return { error: true, message: `Category not found. Use listServiceCategories to get valid category IDs.` };
          }
          args.categoryId = input.categoryId;
        }
        if (input.removeCategoryId !== undefined) args.removeCategoryId = input.removeCategoryId;
        if (input.price !== undefined) args.price = input.price;
        if (input.currency !== undefined) args.currency = input.currency;
        if (input.billingType !== undefined) args.billingType = input.billingType;
        if (input.recurringInterval !== undefined) args.recurringInterval = input.recurringInterval;
        if (input.duration !== undefined) args.duration = input.duration;
        if (input.status !== undefined) args.status = input.status;

        await ctx.runMutation(
          internal.services.mutations.updateServiceInternal,
          args as {
            userId: Id<"users">;
            serviceId: Id<"services">;
            name?: string;
            description?: string;
            categoryId?: Id<"serviceCategories">;
            removeCategoryId?: boolean;
            price?: number;
            currency?: string;
            billingType?: "one_time" | "recurring";
            recurringInterval?: "weekly" | "biweekly" | "monthly" | "quarterly" | "semiannual" | "annual";
            duration?: string;
            status?: "active" | "inactive";
          },
        );

        return { success: true, serviceId: input.serviceId };
      } catch (err) {
        console.error("Update service failed:", err);
        const message = err instanceof Error ? err.message : "Failed to update service";
        return { error: true, message };
      }
    },
  });
}
