import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

interface WorkspaceActionContext {
  effectiveUserId: Id<"users">;
  authenticatedUserId: Id<"users">;
  collaboratorRole: "admin" | "staff" | null;
}

export const resolveForAction = internalQuery({
  args: { authenticatedUserId: v.id("users") },
  handler: async (ctx, { authenticatedUserId }): Promise<WorkspaceActionContext> => {
    const collaborator = await ctx.db
      .query("collaborators")
      .withIndex("by_userId", (q) => q.eq("userId", authenticatedUserId))
      .first();

    if (collaborator && collaborator.status !== "active") {
      throw new Error("Collaborator account is inactive");
    }

    return {
      effectiveUserId: collaborator ? collaborator.ownerId : authenticatedUserId,
      authenticatedUserId,
      collaboratorRole: collaborator?.role ?? null,
    };
  },
});
