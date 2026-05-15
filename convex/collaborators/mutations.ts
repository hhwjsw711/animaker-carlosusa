import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { resolveWorkspaceUserId, assertOwnerOnly } from "../lib/workspace";
import { assertPlanLimit } from "../billing/guards";

const roleValidator = v.union(v.literal("admin"), v.literal("staff"));
const statusValidator = v.union(v.literal("active"), v.literal("inactive"));

export const updateCollaborator = mutation({
  args: {
    collaboratorId: v.id("collaborators"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    color: v.optional(v.string()),
    role: v.optional(roleValidator),
    specialties: v.optional(v.array(v.id("services"))),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, { collaboratorId, ...fields }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertOwnerOnly(ws);
    const { effectiveUserId } = ws;

    const collaborator = await ctx.db.get(collaboratorId);
    if (!collaborator || collaborator.ownerId !== effectiveUserId) {
      throw new Error("Collaborator not found");
    }

    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (!trimmed) throw new Error("Name cannot be empty");
      fields.name = trimmed;
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(collaboratorId, patch);
  },
});

export const deleteCollaborator = mutation({
  args: {
    collaboratorId: v.id("collaborators"),
  },
  handler: async (ctx, { collaboratorId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertOwnerOnly(ws);
    const { effectiveUserId } = ws;

    const collaborator = await ctx.db.get(collaboratorId);
    if (!collaborator || collaborator.ownerId !== effectiveUserId) {
      throw new Error("Collaborator not found");
    }

    await ctx.db.delete(collaboratorId);
  },
});

// ─── Internal ────────────────────────────────────────────────────────────────

export const validateCollaboratorCreation = internalMutation({
  args: {
    ownerId: v.id("users"),
    email: v.string(),
  },
  handler: async (ctx, { ownerId, email }) => {
    await assertPlanLimit(ctx, ownerId, "collaborators");

    const duplicate = await ctx.db
      .query("collaborators")
      .withIndex("by_ownerId_and_email", (q) =>
        q.eq("ownerId", ownerId).eq("email", email),
      )
      .first();
    if (duplicate) {
      throw new Error("Email already in use by another collaborator");
    }
  },
});

export const createCollaboratorInternal = internalMutation({
  args: {
    ownerId: v.id("users"),
    collaboratorUserId: v.optional(v.id("users")),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    color: v.optional(v.string()),
    role: roleValidator,
    specialties: v.optional(v.array(v.id("services"))),
  },
  handler: async (ctx, { ownerId, collaboratorUserId, ...args }) => {
    return await ctx.db.insert("collaborators", {
      ownerId,
      userId: collaboratorUserId ?? undefined,
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      phone: args.phone?.trim() || undefined,
      color: args.color,
      role: args.role,
      specialties: args.specialties,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

export const updateCollaboratorInternal = internalMutation({
  args: {
    userId: v.id("users"),
    collaboratorId: v.id("collaborators"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    color: v.optional(v.string()),
    role: v.optional(roleValidator),
    specialties: v.optional(v.array(v.id("services"))),
    status: v.optional(statusValidator),
  },
  handler: async (ctx, { userId, collaboratorId, ...fields }) => {
    const collaborator = await ctx.db.get(collaboratorId);
    if (!collaborator || collaborator.ownerId !== userId) {
      throw new Error("Collaborator not found");
    }

    if (fields.name !== undefined) {
      const trimmed = fields.name.trim();
      if (!trimmed) throw new Error("Name cannot be empty");
      fields.name = trimmed;
    }

    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }

    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(collaboratorId, patch);
  },
});

export const deleteCollaboratorInternal = internalMutation({
  args: {
    userId: v.id("users"),
    collaboratorId: v.id("collaborators"),
  },
  handler: async (ctx, { userId, collaboratorId }) => {
    const collaborator = await ctx.db.get(collaboratorId);
    if (!collaborator || collaborator.ownerId !== userId) {
      throw new Error("Collaborator not found");
    }

    await ctx.db.delete(collaboratorId);
  },
});
