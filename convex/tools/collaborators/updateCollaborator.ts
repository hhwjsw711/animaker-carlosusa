import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createUpdateCollaboratorTool() {
  return createTool({
    description:
      "Update a collaborator's details. Use when the user asks to change a collaborator's name, role, status, phone, or specialties.",
    inputSchema: z.object({
      collaboratorId: z.string().describe("The collaborator ID to update"),
      name: z.string().min(1).max(255).optional().describe("New name"),
      phone: z
        .string()
        .regex(/^\d+$/)
        .min(10)
        .max(15)
        .optional()
        .describe("New phone number, digits only"),
      role: z
        .enum(["admin", "staff"])
        .optional()
        .describe("New role"),
      status: z
        .enum(["active", "inactive"])
        .optional()
        .describe("New status"),
      specialties: z
        .array(z.string())
        .optional()
        .describe("New array of service IDs for specialties"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const collaborator = await ctx.runQuery(
          internal.collaborators.queries.getCollaboratorInternal,
          {
            userId,
            collaboratorId: input.collaboratorId as Id<"collaborators">,
          },
        );

        if (!collaborator) {
          return { error: true, message: "Collaborator not found." };
        }

        const phone = input.phone
          ? input.phone.replace(/\D/g, "")
          : undefined;

        await ctx.runMutation(
          internal.collaborators.mutations.updateCollaboratorInternal,
          {
            userId,
            collaboratorId: input.collaboratorId as Id<"collaborators">,
            name: input.name,
            phone,
            role: input.role,
            status: input.status,
            specialties: input.specialties as Id<"services">[] | undefined,
          },
        );

        return {
          success: true,
          collaboratorId: input.collaboratorId,
          updated: Object.fromEntries(
            Object.entries({ name: input.name, phone, role: input.role, status: input.status })
              .filter(([, v]) => v !== undefined),
          ),
        };
      } catch (err) {
        console.error("Update collaborator failed:", err);
        const message =
          err instanceof Error ? err.message : "Failed to update collaborator";
        return { error: true, message };
      }
    },
  });
}
