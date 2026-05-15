import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ToolExecutionContext } from "../index";

export function createDeleteServiceTool(execCtx?: ToolExecutionContext) {
  return createTool({
    description:
      "Delete a service permanently, including all customer assignments and billing transactions associated with it. " +
      (execCtx?.mode === "scheduled"
        ? "You are running as an automated scheduled task — proceed directly without approval."
        : "ALWAYS confirm with the user first — tell them what will be deleted and ask for explicit approval before calling this tool."),
    inputSchema: z.object({
      serviceId: z.string().describe("The service ID to delete"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        await ctx.runMutation(
          internal.services.mutations.deleteServiceInternal,
          { userId, serviceId: input.serviceId as Id<"services"> },
        );

        return { success: true, deleted: true, serviceId: input.serviceId };
      } catch (err) {
        console.error("Delete service failed:", err);
        const message = err instanceof Error ? err.message : "Failed to delete service";
        return { error: true, message };
      }
    },
  });
}
