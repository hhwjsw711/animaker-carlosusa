import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createListAppointmentsTool(customerId?: string) {
  return createTool({
    description:
      "List appointments with optional filters by date range, customer, or status. " +
      "Use when the user asks to see, list, or check appointments/schedule.",
    inputSchema: z.object({
      startDate: z.string().optional().describe("Start date filter in ISO 8601 (e.g. '2026-04-07')"),
      endDate: z.string().optional().describe("End date filter in ISO 8601 (e.g. '2026-04-08')"),
      customerId: customerId
        ? z.string().optional().describe("Customer ID (pre-set from context)")
        : z.string().optional().describe("Customer ID to filter by"),
      collaboratorId: z.string().optional().describe("Collaborator/team member ID to filter by"),
      status: z
        .enum(["scheduled", "confirmed", "completed", "cancelled", "no_show"])
        .optional()
        .describe("Status filter"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;
        const resolvedCustomerId = customerId ?? input.customerId;

        let startMs: number | undefined;
        let endMs: number | undefined;

        if (input.startDate) {
          startMs = new Date(input.startDate).getTime();
          if (isNaN(startMs)) {
            return { error: true, message: "Invalid start date format." };
          }
        }
        if (input.endDate) {
          endMs = new Date(input.endDate).getTime();
          if (isNaN(endMs)) {
            return { error: true, message: "Invalid end date format." };
          }
        }

        const appointments = await ctx.runQuery(
          internal.appointments.queries.listAppointmentsInternal,
          {
            userId,
            startDate: startMs,
            endDate: endMs,
            customerId: resolvedCustomerId as Id<"customers"> | undefined,
            collaboratorId: input.collaboratorId as Id<"collaborators"> | undefined,
            status: input.status,
          },
        );

        return {
          found: appointments.length > 0,
          count: appointments.length,
          appointments,
        };
      } catch (err) {
        console.error("List appointments failed:", err);
        const message = err instanceof Error ? err.message : "Failed to list appointments";
        return { error: true, message };
      }
    },
  });
}
