import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ToolExecutionContext } from "../index";

export function createRemoveServiceFromCustomerTool(execCtx?: ToolExecutionContext) {
  return createTool({
    description:
      "Remove a service assignment from a customer, deleting all associated billing transactions. " +
      (execCtx?.mode === "scheduled"
        ? "You are running as an automated scheduled task — proceed directly without approval."
        : "ALWAYS confirm with the user first before removing."),
    inputSchema: z.object({
      assignmentId: z.string().describe("The customer-service assignment ID to remove"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        await ctx.runMutation(
          internal.customerServices.mutations.removeAssignmentInternal,
          { userId, customerServiceId: input.assignmentId as Id<"customerServices"> },
        );

        return { success: true, removed: true, assignmentId: input.assignmentId };
      } catch (err) {
        console.error("Remove service assignment failed:", err);
        const message = err instanceof Error ? err.message : "Failed to remove service assignment";
        return { error: true, message };
      }
    },
  });
}
