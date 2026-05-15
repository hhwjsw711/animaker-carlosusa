import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { resolveWorkspaceUserId, assertNotStaff } from "../lib/workspace";

export const upsertMessagingConfig = mutation({
  args: {
    evolutionInstance: v.optional(v.string()),
    evolutionApiKey: v.optional(v.string()),
    resendApiKey: v.optional(v.string()),
    emailFrom: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const ws = await resolveWorkspaceUserId(ctx);
    assertNotStaff(ws);
    const { effectiveUserId } = ws;

    const existing = await ctx.db
      .query("messagingConfig")
      .withIndex("by_userId", (q) => q.eq("userId", effectiveUserId))
      .first();

    if (existing) {
      const patch: Record<string, unknown> = {};
      if (args.evolutionInstance !== undefined)
        patch.evolutionInstance = args.evolutionInstance;
      if (args.evolutionApiKey !== undefined)
        patch.evolutionApiKey = args.evolutionApiKey;
      if (args.resendApiKey !== undefined)
        patch.resendApiKey = args.resendApiKey;
      if (args.emailFrom !== undefined) patch.emailFrom = args.emailFrom;

      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("messagingConfig", {
      userId: effectiveUserId,
      ...args,
      evolutionStatus: "disconnected",
      warmUpDay: 0,
      messagesToday: 0,
    });
  },
});

export const setEvolutionInstance = internalMutation({
  args: {
    userId: v.id("users"),
    evolutionInstance: v.string(),
    evolutionApiKey: v.string(),
  },
  handler: async (ctx, { userId, evolutionInstance, evolutionApiKey }) => {
    const existing = await ctx.db
      .query("messagingConfig")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { evolutionInstance, evolutionApiKey });
    } else {
      await ctx.db.insert("messagingConfig", {
        userId,
        evolutionInstance,
        evolutionApiKey,
        evolutionStatus: "disconnected",
        warmUpDay: 0,
        messagesToday: 0,
      });
    }
  },
});

export const updateEvolutionStatus = internalMutation({
  args: {
    userId: v.id("users"),
    status: v.union(
      v.literal("disconnected"),
      v.literal("connecting"),
      v.literal("connected"),
    ),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { userId, status, phone }) => {
    const config = await ctx.db
      .query("messagingConfig")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!config) return;

    const patch: Record<string, unknown> = { evolutionStatus: status };
    if (phone !== undefined) patch.evolutionPhone = phone;

    // Start warm-up when first connected
    if (status === "connected" && !config.warmUpStartedAt) {
      patch.warmUpStartedAt = Date.now();
      patch.warmUpDay = 1;
    }

    await ctx.db.patch(config._id, patch);
  },
});

export const incrementDailyMessages = internalMutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, { userId, date }) => {
    const config = await ctx.db
      .query("messagingConfig")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!config) return;

    const patch: Record<string, unknown> = {};

    if (config.messagesTodayDate === date) {
      patch.messagesToday = (config.messagesToday ?? 0) + 1;
    } else {
      // New day: reset counter, advance warm-up day
      patch.messagesToday = 1;
      patch.messagesTodayDate = date;

      if (config.warmUpStartedAt) {
        const daysSinceStart = Math.floor(
          (Date.now() - config.warmUpStartedAt) / (24 * 60 * 60 * 1000),
        );
        patch.warmUpDay = Math.min(daysSinceStart + 1, 8);
      }
    }

    await ctx.db.patch(config._id, patch);
  },
});
