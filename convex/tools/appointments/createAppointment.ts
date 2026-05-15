import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createCreateAppointmentTool(customerId?: string) {
  return createTool({
    description:
      "Create a new appointment/scheduling for a customer with a service at a specific date and time. " +
      "Use when the user asks to schedule, book, or create an appointment.",
    inputSchema: z.object({
      customerId: customerId
        ? z.string().optional().describe("Customer ID (pre-set from context)")
        : z.string().describe("Customer ID (use listCustomers to find)"),
      serviceId: z.string().optional().describe("Service ID (use listServices to find). At least serviceId or collaboratorId is required."),
      collaboratorId: z.string().optional().describe("Collaborator/team member ID (use listCollaborators to find). At least serviceId or collaboratorId is required."),
      title: z.string().optional().describe("Optional custom title for the appointment"),
      startTime: z.string().describe("Start date and time in ISO 8601 format (e.g. '2026-04-07T09:00:00')"),
      endTime: z.string().describe("End date and time in ISO 8601 format (e.g. '2026-04-07T10:00:00')"),
      notes: z.string().optional().describe("Optional notes about the appointment"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;
        const resolvedCustomerId = (customerId ?? input.customerId) as Id<"customers">;

        if (!resolvedCustomerId) {
          return { error: true, message: "Customer ID is required." };
        }

        if (!input.serviceId && !input.collaboratorId) {
          return { error: true, message: "At least a service or collaborator is required." };
        }

        const startMs = new Date(input.startTime).getTime();
        const endMs = new Date(input.endTime).getTime();

        if (isNaN(startMs) || isNaN(endMs)) {
          return { error: true, message: "Invalid date format. Use ISO 8601 (e.g. '2026-04-07T09:00:00')." };
        }

        if (endMs <= startMs) {
          return { error: true, message: "End time must be after start time." };
        }

        const appointmentId = await ctx.runMutation(
          internal.appointments.mutations.createAppointmentInternal,
          {
            userId,
            customerId: resolvedCustomerId,
            serviceId: input.serviceId as Id<"services"> | undefined,
            collaboratorId: input.collaboratorId as Id<"collaborators"> | undefined,
            title: input.title,
            startTime: startMs,
            endTime: endMs,
            notes: input.notes,
          },
        );

        return {
          success: true,
          appointmentId: appointmentId as string,
          startTime: input.startTime,
          endTime: input.endTime,
        };
      } catch (err) {
        console.error("Create appointment failed:", err);
        const message = err instanceof Error ? err.message : "Failed to create appointment";
        return { error: true, message };
      }
    },
  });
}
