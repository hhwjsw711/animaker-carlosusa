import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ToolExecutionContext } from "../index";

export function createCancelAppointmentTool(execCtx?: ToolExecutionContext) {
  return createTool({
    description:
      "Cancel an appointment by setting its status to 'cancelled'. " +
      (execCtx?.mode === "scheduled"
        ? "You are running as an automated scheduled task — proceed directly without approval."
        : "ALWAYS confirm with the user first — tell them which appointment will be cancelled and ask for explicit approval before calling this tool."),
    inputSchema: z.object({
      appointmentId: z.string().describe("The appointment ID to cancel"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        await ctx.runMutation(
          internal.appointments.mutations.updateAppointmentInternal,
          {
            userId,
            appointmentId: input.appointmentId as Id<"appointments">,
            status: "cancelled",
          },
        );

        return { success: true, appointmentId: input.appointmentId, status: "cancelled" };
      } catch (err) {
        console.error("Cancel appointment failed:", err);
        const message = err instanceof Error ? err.message : "Failed to cancel appointment";
        return { error: true, message };
      }
    },
  });
}
