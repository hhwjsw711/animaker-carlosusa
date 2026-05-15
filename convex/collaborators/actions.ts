import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { createAccount, getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";

const roleValidator = v.union(v.literal("admin"), v.literal("staff"));

export const createCollaborator = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    phone: v.optional(v.string()),
    color: v.optional(v.string()),
    role: roleValidator,
    specialties: v.optional(v.array(v.id("services"))),
  },
  handler: async (ctx, args): Promise<Id<"collaborators">> => {
    const ownerId = await getAuthUserId(ctx);
    if (!ownerId) throw new Error("Not authenticated");

    const trimmedName = args.name.trim();
    if (!trimmedName) throw new Error("Name is required");

    const trimmedEmail = args.email.trim().toLowerCase();
    if (!trimmedEmail) throw new Error("Email is required");

    if (!args.password || args.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    // Validate limits and duplicates
    await ctx.runMutation(
      internal.collaborators.mutations.validateCollaboratorCreation,
      { ownerId, email: trimmedEmail },
    );

    // Create auth account for the collaborator
    const { user } = await createAccount(ctx, {
      provider: "password",
      account: {
        id: trimmedEmail,
        secret: args.password,
      },
      profile: {
        name: trimmedName,
        email: trimmedEmail,
      },
      shouldLinkViaEmail: false,
    });

    // Create the collaborator record linking to the new user
    const collaboratorId: Id<"collaborators"> = await ctx.runMutation(
      internal.collaborators.mutations.createCollaboratorInternal,
      {
        ownerId,
        collaboratorUserId: user._id,
        name: trimmedName,
        email: trimmedEmail,
        phone: args.phone?.trim() || undefined,
        color: args.color,
        role: args.role,
        specialties: args.specialties,
      },
    );

    return collaboratorId;
  },
});
