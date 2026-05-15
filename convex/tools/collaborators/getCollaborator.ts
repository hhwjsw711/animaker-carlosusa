import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createGetCollaboratorTool() {
  return createTool({
    description:
      "Get details of a specific collaborator/team member. Use when the user asks about a specific collaborator's information.",
    inputSchema: z.object({
      collaboratorId: z.string().describe("The collaborator ID to look up"),
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

        return {
          found: true,
          collaborator: {
            id: collaborator._id,
            name: collaborator.name,
            email: collaborator.email,
            phone: collaborator.phone ?? null,
            role: collaborator.role,
            color: collaborator.color ?? null,
            status: collaborator.status,
            specialties: collaborator.specialties ?? [],
            createdAt: collaborator.createdAt,
          },
        };
      } catch (err) {
        console.error("Get collaborator failed:", err);
        return { error: true, message: "Failed to get collaborator details." };
      }
    },
  });
}
