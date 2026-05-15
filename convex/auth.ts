import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTP } from "./emails/ResendOTP";
import { internal } from "./_generated/api";
import type { DatabaseWriter } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: ResendOTP,
      validatePasswordRequirements: (password: string) => {
        if (!password || password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
      },
    }),
  ],
  callbacks: {
    afterUserCreatedOrUpdated: async (ctx, { userId }) => {
      // Skip credit initialization for collaborator accounts — they use the owner's credits
      // Cast needed: auth callback ctx.db is typed as AnyDataModel, not our schema
      const db = ctx.db as unknown as DatabaseWriter;
      const collaborator = await db
        .query("collaborators")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();
      if (collaborator) return;

      await ctx.runMutation(internal.billing.credits.initializeCredits, {
        userId,
      });
    },
  },
});
