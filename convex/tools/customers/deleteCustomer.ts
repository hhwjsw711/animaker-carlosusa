import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ToolExecutionContext } from "../index";

export function createDeleteCustomerTool(
  customerId?: string,
  execCtx?: ToolExecutionContext,
) {
  const isScoped = !!customerId;
  const isScheduled = execCtx?.mode === "scheduled";

  const description = isScoped
    ? isScheduled
      ? "Delete the current customer and all their associated data. You are running as an automated scheduled task — proceed directly."
      : "Delete the current customer and all their associated data (profile, files, scheduled tasks). CRITICAL: Always confirm with the user before calling this tool — tell them what will be deleted and ask for explicit approval."
    : isScheduled
      ? "Delete a customer and all their associated data. You are running as an automated scheduled task — proceed directly."
      : "Delete a customer and all their associated data (profile, files, scheduled tasks). CRITICAL: Always confirm with the user before calling this tool — tell them what will be deleted and ask for explicit approval.";

  return createTool({
    description,
    inputSchema: isScoped
      ? z.object({
          customerName: z
            .string()
            .describe("The customer's name, for confirmation purposes"),
        })
      : z.object({
          customerId: z.string().describe("The customer ID to delete"),
          customerName: z
            .string()
            .describe("The customer's name, for confirmation purposes"),
        }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const targetId = isScoped
          ? (customerId as string)
          : (input as Record<string, unknown>).customerId as string;

        const customer = await ctx.runQuery(
          internal.customers.queries.getCustomerInternal,
          { customerId: targetId as Id<"customers">, userId },
        );

        if (!customer) {
          return { error: true, message: "Customer not found." };
        }

        await ctx.runMutation(
          internal.customers.mutations.deleteCustomerInternal,
          { userId, customerId: targetId as Id<"customers"> },
        );

        return {
          success: true,
          deletedCustomer: input.customerName,
        };
      } catch (err) {
        console.error("Delete customer failed:", err);
        const message =
          err instanceof Error ? err.message : "Failed to delete customer";
        return { error: true, message };
      }
    },
  });
}
