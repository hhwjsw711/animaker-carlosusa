import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export function createListNotesTool(customerId: string) {
  return createTool({
    description:
      "List all notes for the current customer. Use when the user asks to see, list, or view notes or annotations.",
    inputSchema: z.object({}),
    execute: async (ctx) => {
      try {
        if (!ctx.userId) {
          return { error: true, message: "User not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const notes = await ctx.runQuery(
          internal.customerNotes.queries.listCustomerNotesInternal,
          {
            userId,
            customerId: customerId as Id<"customers">,
          },
        );

        return {
          found: true,
          count: notes.length,
          notes,
        };
      } catch (err) {
        console.error("List notes failed:", err);
        return { error: true, message: "Failed to list notes." };
      }
    },
  });
}
