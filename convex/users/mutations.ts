import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
} from "../_generated/server";
import { api, internal } from "../_generated/api";
import {
  getAuthSessionId,
  getAuthUserId,
  retrieveAccount,
  modifyAccountCredentials,
  invalidateSessions,
} from "@convex-dev/auth/server";
import { validateBirthDate } from "../tools/customers/validation";
import { assertBunnyPathPrefix, IMAGE_ONLY } from "../bunny/validate";
import { uploadToBunny } from "../bunny/upload";

export const getSessionId = internalQuery({
  handler: async (ctx) => {
    return await getAuthSessionId(ctx);
  },
});

export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { currentPassword, newPassword }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.queries.getMe);
    if (!user?.email) throw new Error("User not found");

    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    try {
      await retrieveAccount(ctx, {
        provider: "password",
        account: { id: user.email, secret: currentPassword },
      });
    } catch {
      throw new Error("Current password is incorrect");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: user.email, secret: newPassword },
    });

    const sessionId = await ctx.runQuery(
      internal.users.mutations.getSessionId,
    );
    await invalidateSessions(ctx, {
      userId: user._id,
      except: sessionId ? [sessionId] : [],
    });
  },
});

export const checkEmailAvailability = internalQuery({
  args: { email: v.string(), excludeUserId: v.id("users") },
  handler: async (ctx, { email, excludeUserId }) => {
    const existingAccount = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("providerAccountId"), email),
          q.neq(q.field("userId"), excludeUserId),
        ),
      )
      .first();
    return !existingAccount;
  },
});

export const updateUserEmail = internalMutation({
  args: {
    userId: v.id("users"),
    oldEmail: v.string(),
    newEmail: v.string(),
  },
  handler: async (ctx, { userId, oldEmail, newEmail }) => {
    await ctx.db.patch(userId, { email: newEmail });

    const account = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("provider"), "password"),
          q.eq(q.field("providerAccountId"), oldEmail),
        ),
      )
      .first();

    if (account) {
      await ctx.db.patch(account._id, { providerAccountId: newEmail });
    }
  },
});

export const changeEmail = action({
  args: {
    currentPassword: v.string(),
    newEmail: v.string(),
  },
  handler: async (ctx, { currentPassword, newEmail }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.queries.getMe);
    if (!user?.email) throw new Error("User not found");

    const trimmedEmail = newEmail.trim().toLowerCase();
    if (trimmedEmail === user.email) {
      throw new Error("New email must be different from current email");
    }

    try {
      await retrieveAccount(ctx, {
        provider: "password",
        account: { id: user.email, secret: currentPassword },
      });
    } catch {
      throw new Error("Current password is incorrect");
    }

    const isAvailable = await ctx.runQuery(
      internal.users.mutations.checkEmailAvailability,
      { email: trimmedEmail, excludeUserId: user._id },
    );
    if (!isAvailable) {
      throw new Error("Email already in use");
    }

    await ctx.runMutation(internal.users.mutations.updateUserEmail, {
      userId: user._id,
      oldEmail: user.email,
      newEmail: trimmedEmail,
    });

    const sessionId = await ctx.runQuery(
      internal.users.mutations.getSessionId,
    );
    await invalidateSessions(ctx, {
      userId: user._id,
      except: sessionId ? [sessionId] : [],
    });
  },
});

export const uploadProfilePhoto = action({
  args: {
    bytes: v.bytes(),
    contentType: v.string(),
  },
  returns: v.object({ bunnyPath: v.string() }),
  handler: async (ctx, { bytes, contentType }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.runMutation(internal.rateLimit.mutations.checkUploadRateLimit, {
      userId,
    });

    const result = await uploadToBunny({
      bytes,
      contentType,
      size: bytes.byteLength,
      folder: `users/${userId}`,
      allowedCategories: IMAGE_ONLY,
    });

    return { bunnyPath: result.path };
  },
});

export const completeOnboarding = mutation({
  args: {
    useCase: v.union(
      v.literal("customers"),
      v.literal("chat"),
      v.literal("automation"),
      v.literal("all"),
    ),
  },
  handler: async (ctx, { useCase }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(userId, {
      onboardingCompleted: true,
      onboardingUseCase: useCase,
    });
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    bio: v.optional(v.string()),
    photoBunnyPath: v.optional(v.string()),
    removePhoto: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (args.name !== undefined && !args.name.trim()) {
      throw new Error("Name cannot be empty");
    }

    const updates: Record<string, unknown> = {};

    if (args.removePhoto) {
      if (user.photoBunnyPath) {
        await ctx.scheduler.runAfter(
          0,
          internal.bunny.internalActions.deletePath,
          { path: user.photoBunnyPath },
        );
      }
      updates.photoBunnyPath = undefined;
    } else if (
      args.photoBunnyPath &&
      args.photoBunnyPath !== user.photoBunnyPath
    ) {
      assertBunnyPathPrefix(args.photoBunnyPath, `users/${userId}`);
      if (user.photoBunnyPath) {
        await ctx.scheduler.runAfter(
          0,
          internal.bunny.internalActions.deletePath,
          { path: user.photoBunnyPath },
        );
      }
      updates.photoBunnyPath = args.photoBunnyPath;
    }

    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.birthDate !== undefined) {
      if (args.birthDate) {
        const err = validateBirthDate(args.birthDate);
        if (err) throw new Error(`Invalid birth date: ${err}`);
      }
      updates.birthDate = args.birthDate || undefined;
    }
    if (args.bio !== undefined) updates.bio = args.bio || undefined;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(userId, updates);
    }
  },
});

