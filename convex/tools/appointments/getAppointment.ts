import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createGetAppointmentTool() {
  return createTool({
    description:
      "Get details of a specific appointment by its ID. " +
      "Use when the user asks for details about a specific appointment.",
    inputSchema: z.object({
      appointmentId: z.string().describe("The appointment ID"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const appointment = await ctx.runQuery(
          internal.appointments.queries.getAppointmentInternal,
          {
            userId,
            appointmentId: input.appointmentId as Id<"appointments">,
          },
        );

        if (!appointment) {
          return { error: true, message: "Appointment not found." };
        }

        return { success: true, appointment };
      } catch (err) {
        console.error("Get appointment failed:", err);
        const message = err instanceof Error ? err.message : "Failed to get appointment";
        return { error: true, message };
      }
    },
  });
}
