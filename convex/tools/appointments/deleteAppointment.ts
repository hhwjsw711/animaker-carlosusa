import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ToolExecutionContext } from "../index";

export function createDeleteAppointmentTool(execCtx?: ToolExecutionContext) {
  return createTool({
    description:
      "Delete an appointment permanently. " +
      (execCtx?.mode === "scheduled"
        ? "You are running as an automated scheduled task — proceed directly without approval."
        : "ALWAYS confirm with the user first — tell them which appointment will be deleted and ask for explicit approval before calling this tool."),
    inputSchema: z.object({
      appointmentId: z.string().describe("The appointment ID to delete"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        await ctx.runMutation(
          internal.appointments.mutations.deleteAppointmentInternal,
          {
            userId,
            appointmentId: input.appointmentId as Id<"appointments">,
          },
        );

        return { success: true, deleted: true, appointmentId: input.appointmentId };
      } catch (err) {
        console.error("Delete appointment failed:", err);
        const message = err instanceof Error ? err.message : "Failed to delete appointment";
        return { error: true, message };
      }
    },
  });
}
