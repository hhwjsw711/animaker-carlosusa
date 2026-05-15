import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createCreateServiceTool() {
  return createTool({
    description:
      "Create a new service in the catalog with name, price, currency, billing type, and optional details. Use when the user asks to add, register, or create a new service or product.",
    inputSchema: z.object({
      name: z.string().min(1).max(255).describe("Service name"),
      description: z.string().optional().describe("Service description"),
      categoryId: z.string().optional().describe("Service category ID (use listServiceCategories to find available categories)"),
      price: z.number().min(0).describe("Price in cents (e.g. 5000 = $50.00 or R$50,00)"),
      currency: z.string().default("BRL").describe("Currency code: BRL, USD, EUR, etc."),
      billingType: z.enum(["one_time", "recurring"]).describe("Billing type: one_time or recurring"),
      recurringInterval: z
        .enum(["weekly", "biweekly", "monthly", "quarterly", "semiannual", "annual"])
        .optional()
        .describe("Recurring interval (required if billingType is recurring)"),
      duration: z.string().optional().describe("Duration or unit (e.g. '60 min', 'per session', 'per hour')"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        if (input.billingType === "recurring" && !input.recurringInterval) {
          return { error: true, message: "Recurring interval is required for recurring services." };
        }

        // Validate categoryId exists before passing to mutation
        if (input.categoryId) {
          const category = await ctx.runQuery(
            internal.serviceCategories.queries.getCategoryInternal,
            { categoryId: input.categoryId as Id<"serviceCategories"> },
          );
          if (!category) {
            return { error: true, message: `Category not found. Use listServiceCategories to get valid category IDs.` };
          }
        }

        // Validate categoryId exists before passing to mutation
        if (input.categoryId) {
          const category = await ctx.runQuery(
            internal.serviceCategories.queries.getCategoryInternal,
            { categoryId: input.categoryId as Id<"serviceCategories"> },
          );
          if (!category) {
            return { error: true, message: `Category not found. Use listServiceCategories to get valid category IDs.` };
          }
        }

        // Validate categoryId exists before passing to mutation
        if (input.categoryId) {
          const category = await ctx.runQuery(
            internal.serviceCategories.queries.getCategoryInternal,
            { categoryId: input.categoryId as Id<"serviceCategories"> },
          );
          if (!category) {
            return { error: true, message: `Category not found. Use listServiceCategories to get valid category IDs.` };
          }
        }

        // Validate categoryId exists before passing to mutation
        if (input.categoryId) {
          const category = await ctx.runQuery(
            internal.serviceCategories.queries.getCategoryInternal,
            { categoryId: input.categoryId as Id<"serviceCategories"> },
          );
          if (!category) {
            return { error: true, message: `Category not found. Use listServiceCategories to get valid category IDs.` };
          }
        }

        const serviceId = await ctx.runMutation(
          internal.services.mutations.createServiceInternal,
          {
            userId,
            name: input.name,
            description: input.description,
            categoryId: input.categoryId as Id<"serviceCategories"> | undefined,
            price: input.price,
            currency: input.currency,
            billingType: input.billingType,
            recurringInterval: input.recurringInterval,
            duration: input.duration,
          },
        );

        return {
          success: true,
          serviceId: serviceId as string,
          name: input.name.trim(),
          price: input.price,
          currency: input.currency,
          billingType: input.billingType,
        };
      } catch (err) {
        console.error("Create service failed:", err);
        const message = err instanceof Error ? err.message : "Failed to create service";
        return { error: true, message };
      }
    },
  });
}
