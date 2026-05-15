import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createUpdateNoteTool(_customerId: string) {
  return createTool({
    description:
      "Update an existing note for the current customer. Use when the user asks to edit, change, or update a note or annotation.",
    inputSchema: z.object({
      noteId: z.string().describe("The note ID to update"),
      content: z.string().min(1).describe("The new note text content"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        await ctx.runMutation(
          internal.customerNotes.mutations.updateNoteInternal,
          {
            userId,
            noteId: input.noteId as Id<"customerNotes">,
            content: input.content,
          },
        );

        return { success: true };
      } catch (err) {
        console.error("Update note failed:", err);
        const message =
          err instanceof Error ? err.message : "Failed to update note";
        return { error: true, message };
      }
    },
  });
}
