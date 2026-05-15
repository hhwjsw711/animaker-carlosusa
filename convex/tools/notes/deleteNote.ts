import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createDeleteNoteTool(_customerId: string) {
  return createTool({
    description:
      "Delete a note for the current customer. CRITICAL: Always confirm with the user before calling this tool — tell them what note will be deleted and ask for explicit approval.",
    inputSchema: z.object({
      noteId: z.string().describe("The note ID to delete"),
    }),
    execute: async (ctx, input) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        await ctx.runMutation(
          internal.customerNotes.mutations.deleteNoteInternal,
          {
            userId,
            noteId: input.noteId as Id<"customerNotes">,
          },
        );

        return { success: true };
      } catch (err) {
        console.error("Delete note failed:", err);
        const message =
          err instanceof Error ? err.message : "Failed to delete note";
        return { error: true, message };
      }
    },
  });
}
