import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createUpdateAppointmentTool() {
  return createTool({
    description:
      "Update an existing appointment's details such as date, time, customer, service, status, or notes. " +
      "Use when the user asks to change, reschedule, or update an appointment.",
    inputSchema: z.object({
      appointmentId: z.string().describe("The appointment ID to update"),
      customerId: z.string().optional().describe("New customer ID"),
      serviceId: z.string().optional().describe("New service ID"),
      collaboratorId: z.string().optional().describe("New collaborator/team member ID"),
      title: z.string().optional().describe("New title"),
      startTime: z.string().optional().describe("New start time in ISO 8601 format"),
      endTime: z.string().optional().describe("New end time in ISO 8601 format"),
      status: z
        .enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"])
        .optional()
        .describe("New status"),
      notes: z.string().optional().describe("New notes"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const args: Record<string, unknown> = {
          userId,
          appointmentId: input.appointmentId as Id<"appointments">,
        };

        if (input.customerId) args.customerId = input.customerId as Id<"customers">;
        if (input.serviceId) args.serviceId = input.serviceId as Id<"services">;
        if (input.collaboratorId) args.collaboratorId = input.collaboratorId as Id<"collaborators">;
        if (input.title !== undefined) args.title = input.title;
        if (input.notes !== undefined) args.notes = input.notes;
        if (input.status) args.status = input.status;

        if (input.startTime) {
          const ms = new Date(input.startTime).getTime();
          if (isNaN(ms)) return { error: true, message: "Invalid start time format." };
          args.startTime = ms;
        }
        if (input.endTime) {
          const ms = new Date(input.endTime).getTime();
          if (isNaN(ms)) return { error: true, message: "Invalid end time format." };
          args.endTime = ms;
        }

        await ctx.runMutation(
          internal.appointments.mutations.updateAppointmentInternal,
          args as never,
        );

        return { success: true, appointmentId: input.appointmentId };
      } catch (err) {
        console.error("Update appointment failed:", err);
        const message = err instanceof Error ? err.message : "Failed to update appointment";
        return { error: true, message };
      }
    },
  });
}
