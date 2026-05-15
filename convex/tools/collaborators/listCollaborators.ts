import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createListCollaboratorsTool() {
  return createTool({
    description:
      "List or search the user's collaborators/team members. Use when the user asks to see their team, find a collaborator by name, or check who is on the team.",
    inputSchema: z.object({
      status: z
        .enum(["active", "inactive"])
        .optional()
        .describe("Optional filter by collaborator status"),
      search: z
        .string()
        .optional()
        .describe("Optional search term to filter by name or email"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const collaborators = await ctx.runQuery(
          internal.collaborators.queries.listCollaboratorsInternal,
          {
            userId,
            status: input.status,
            search: input.search,
          },
        );

        if (collaborators.length === 0) {
          return {
            found: false,
            message: input.search
              ? "No collaborators found matching your search."
              : "No collaborators yet.",
          };
        }

        return {
          found: true,
          count: collaborators.length,
          collaborators: collaborators.map((c: { _id: string; name: string; email: string; phone?: string; role: string; status: string }) => ({
            id: c._id,
            name: c.name,
            email: c.email,
            phone: c.phone ?? null,
            role: c.role,
            status: c.status,
          })),
        };
      } catch (err) {
        console.error("List collaborators failed:", err);
        return { error: true, message: "Failed to list collaborators." };
      }
    },
  });
}
