import { v } from "convex/values";
import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { publicUrl } from "../bunny/url";

export const getMe = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      photoBunnyPath: v.optional(v.string()),
      photoUrl: v.optional(v.string()),
      birthDate: v.optional(v.string()),
      bio: v.optional(v.string()),
      onboardingCompleted: v.optional(v.boolean()),
      onboardingUseCase: v.optional(
        v.union(
          v.literal("customers"),
          v.literal("chat"),
          v.literal("automation"),
          v.literal("all"),
        ),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const photoUrl = user.photoBunnyPath
      ? publicUrl(user.photoBunnyPath, { width: 256, format: "webp" })
      : undefined;
    return {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      photoBunnyPath: user.photoBunnyPath,
      photoUrl,
      birthDate: user.birthDate,
      bio: user.bio,
      onboardingCompleted: user.onboardingCompleted,
      onboardingUseCase: user.onboardingUseCase,
    };
  },
});
