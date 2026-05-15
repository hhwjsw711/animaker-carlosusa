import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createCreateCollaboratorTool() {
  return createTool({
    description:
      "Create a new collaborator/team member. Use when the user asks to add, register, or invite a collaborator, staff member, or team member. NOTE: This only creates the collaborator record — the collaborator's auth account must be created separately via the invite flow.",
    inputSchema: z.object({
      name: z.string().min(1).max(255).describe("Collaborator's full name"),
      email: z
        .string()
        .email()
        .describe("Collaborator's email address (used for login)"),
      phone: z
        .string()
        .regex(/^\d+$/)
        .min(10)
        .max(15)
        .optional()
        .describe(
          "Phone number, digits only, with country code (e.g. 5511999887766)",
        ),
      role: z
        .enum(["admin", "staff"])
        .optional()
        .describe(
          "Collaborator's role: 'admin' for full access, 'staff' for limited access (default: staff)",
        ),
      specialties: z
        .array(z.string())
        .optional()
        .describe("Array of service IDs that this collaborator specializes in"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const phone = input.phone
          ? input.phone.replace(/\D/g, "")
          : undefined;

        const collaboratorId = await ctx.runMutation(
          internal.collaborators.mutations.createCollaboratorInternal,
          {
            ownerId: userId,
            name: input.name,
            email: input.email,
            phone,
            role: input.role ?? "staff",
            specialties: input.specialties as Id<"services">[] | undefined,
          },
        );

        return {
          success: true,
          collaboratorId: collaboratorId as string,
          name: input.name.trim(),
          email: input.email,
          role: input.role ?? "staff",
        };
      } catch (err) {
        console.error("Create collaborator failed:", err);
        const message =
          err instanceof Error ? err.message : "Failed to create collaborator";
        return { error: true, message };
      }
    },
  });
}
