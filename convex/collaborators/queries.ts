import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";
import { paginationOptsValidator } from "convex/server";

export const listCollaborators = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return { page: [], isDone: true, continueCursor: "" };

    return await ctx.db
      .query("collaborators")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ws.effectiveUserId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const listActiveCollaboratorsLight = query({
  args: {},
  handler: async (ctx) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return [];

    const collaborators = await ctx.db
      .query("collaborators")
      .withIndex("by_ownerId_and_status", (q) =>
        q.eq("ownerId", ws.effectiveUserId).eq("status", "active"),
      )
      .take(200);

    return collaborators.map((c) => ({
      _id: c._id,
      name: c.name,
      color: c.color,
    }));
  },
});

export const getCollaborator = query({
  args: { collaboratorId: v.id("collaborators") },
  handler: async (ctx, { collaboratorId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    const collaborator = await ctx.db.get(collaboratorId);
    if (!collaborator || collaborator.ownerId !== ws.effectiveUserId) return null;

    return collaborator;
  },
});

export const getMyCollaboratorProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("collaborators")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

// ─── Internal (for AI agent) ──────────────────────────────────────────────────

export const listCollaboratorsInternal = internalQuery({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { userId, status, search }) => {
    let collaborators;

    if (status === "active" || status === "inactive") {
      collaborators = await ctx.db
        .query("collaborators")
        .withIndex("by_ownerId_and_status", (q) =>
          q.eq("ownerId", userId).eq("status", status),
        )
        .take(200);
    } else {
      collaborators = await ctx.db
        .query("collaborators")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
        .take(200);
    }

    if (search) {
      const term = search.toLowerCase().trim();
      collaborators = collaborators.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term),
      );
    }

    return collaborators.map((c) => ({
      _id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      role: c.role,
      color: c.color,
      status: c.status,
      specialties: c.specialties,
    }));
  },
});

export const getCollaboratorInternal = internalQuery({
  args: {
    userId: v.id("users"),
    collaboratorId: v.id("collaborators"),
  },
  handler: async (ctx, { userId, collaboratorId }) => {
    const collaborator = await ctx.db.get(collaboratorId);
    if (!collaborator || collaborator.ownerId !== userId) return null;

    return {
      _id: collaborator._id,
      name: collaborator.name,
      email: collaborator.email,
      phone: collaborator.phone,
      role: collaborator.role,
      color: collaborator.color,
      status: collaborator.status,
      specialties: collaborator.specialties,
      createdAt: collaborator.createdAt,
    };
  },
});
