import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { ToolExecutionContext } from "../index";

export function createDeleteCollaboratorTool(execCtx?: ToolExecutionContext) {
  const isScheduled = execCtx?.mode === "scheduled";

  const description = isScheduled
    ? "Delete a collaborator/team member. You are running as an automated scheduled task — proceed directly."
    : "Delete a collaborator/team member. CRITICAL: Always confirm with the user before calling this tool — tell them who will be removed and ask for explicit approval.";

  return createTool({
    description,
    inputSchema: z.object({
      collaboratorId: z.string().describe("The collaborator ID to delete"),
      collaboratorName: z
        .string()
        .describe("The collaborator's name, for confirmation purposes"),
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

        await ctx.runMutation(
          internal.collaborators.mutations.deleteCollaboratorInternal,
          {
            userId,
            collaboratorId: input.collaboratorId as Id<"collaborators">,
          },
        );

        return {
          success: true,
          deletedCollaborator: input.collaboratorName,
        };
      } catch (err) {
        console.error("Delete collaborator failed:", err);
        const message =
          err instanceof Error ? err.message : "Failed to delete collaborator";
        return { error: true, message };
      }
    },
  });
}
