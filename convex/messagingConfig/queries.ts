import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";

export const getMessagingConfig = query({
  args: {},
  handler: async (ctx) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    const config = await ctx.db
      .query("messagingConfig")
      .withIndex("by_userId", (q) => q.eq("userId", ws.effectiveUserId))
      .first();

    if (!config) return null;

    return {
      _id: config._id,
      evolutionInstance: config.evolutionInstance ?? "",
      evolutionStatus: config.evolutionStatus ?? "disconnected",
      evolutionPhone: config.evolutionPhone ?? "",
      hasEvolutionCredentials: !!(
        config.evolutionInstance && config.evolutionApiKey
      ),
      warmUpDay: config.warmUpDay ?? 0,
      messagesToday: config.messagesToday ?? 0,
      resendApiKey: config.resendApiKey ? "••••••••" : "",
      emailFrom: config.emailFrom ?? "",
    };
  },
});

export const getMessagingConfigByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("messagingConfig")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const findConfigByInstance = internalQuery({
  args: { instanceName: v.string() },
  handler: async (ctx, { instanceName }) => {
    return await ctx.db
      .query("messagingConfig")
      .withIndex("by_evolutionInstance", (q) =>
        q.eq("evolutionInstance", instanceName),
      )
      .first();
  },
});

