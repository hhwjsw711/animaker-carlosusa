import { QueryCtx, MutationCtx, internalQuery } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "../_generated/dataModel";

export interface WorkspaceContext {
  /** The owner's userId — use this for all data queries */
  effectiveUserId: Id<"users">;
  /** The actual authenticated user's ID */
  authenticatedUserId: Id<"users">;
  /** The collaborator record if the authenticated user is a collaborator, null otherwise */
  collaborator: Doc<"collaborators"> | null;
}

/**
 * Resolves the workspace context for the current authenticated user.
 * If the user is a collaborator, returns the owner's userId as effectiveUserId.
 * If the user is an owner, returns their own userId.
 * Throws if not authenticated or if collaborator is inactive.
 */
export async function resolveWorkspaceUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<WorkspaceContext> {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) throw new Error("Not authenticated");

  const collaborator = await ctx.db
    .query("collaborators")
    .withIndex("by_userId", (q) => q.eq("userId", authUserId))
    .first();

  if (collaborator && collaborator.status !== "active") {
    throw new Error("Collaborator account is inactive");
  }

  return {
    effectiveUserId: collaborator ? collaborator.ownerId : authUserId,
    authenticatedUserId: authUserId,
    collaborator,
  };
}

/**
 * Safe variant that returns null instead of throwing when unauthenticated.
 * Used by queries that return empty results for unauthenticated users.
 */
export async function tryResolveWorkspaceUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<WorkspaceContext | null> {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) return null;

  const collaborator = await ctx.db
    .query("collaborators")
    .withIndex("by_userId", (q) => q.eq("userId", authUserId))
    .first();

  if (collaborator && collaborator.status !== "active") {
    throw new Error("Collaborator account is inactive");
  }

  return {
    effectiveUserId: collaborator ? collaborator.ownerId : authUserId,
    authenticatedUserId: authUserId,
    collaborator,
  };
}

/** Throws if the user is a collaborator (only owner allowed). */
export function assertOwnerOnly(ws: WorkspaceContext): void {
  if (ws.collaborator) {
    throw new Error("Insufficient permissions");
  }
}

/**
 * Action-callable variant: resolves the workspace owner via an internal query,
 * since actions don't have direct `ctx.db` access. Returns the same shape as
 * `resolveWorkspaceUserId` but as a plain serializable object.
 */
export const resolveWorkspaceForAction = internalQuery({
  args: {},
  handler: async (ctx) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return null;

    const collaborator = await ctx.db
      .query("collaborators")
      .withIndex("by_userId", (q) => q.eq("userId", authUserId))
      .first();

    if (collaborator && collaborator.status !== "active") {
      return { error: "INACTIVE_COLLABORATOR" as const };
    }

    return {
      effectiveUserId: collaborator ? collaborator.ownerId : authUserId,
      authenticatedUserId: authUserId,
      isCollaborator: !!collaborator,
      collaboratorRole: collaborator?.role ?? null,
    };
  },
});

/** Throws if the user is a staff collaborator. Owner and admin are allowed. */
export function assertNotStaff(ws: WorkspaceContext): void {
  if (ws.collaborator?.role === "staff") {
    throw new Error("Insufficient permissions");
  }
}
