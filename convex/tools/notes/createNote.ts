import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createCreateNoteTool(customerId: string) {
  return createTool({
    description:
      "Create a new note for the current customer. Use when the user asks to add, write, or save a note or annotation.",
    inputSchema: z.object({
      content: z.string().min(1).describe("The note text content"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const noteId = await ctx.runMutation(
          internal.customerNotes.mutations.createNoteInternal,
          {
            userId,
            customerId: customerId as Id<"customers">,
            content: input.content,
          },
        );

        return {
          success: true,
          noteId: noteId as string,
        };
      } catch (err) {
        console.error("Create note failed:", err);
        const message =
          err instanceof Error ? err.message : "Failed to create note";
        return { error: true, message };
      }
    },
  });
}
