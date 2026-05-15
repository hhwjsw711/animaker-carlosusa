import { v } from "convex/values";
import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";
import { internalMutation } from "../_generated/server";

const rateLimiter = new RateLimiter(components.rateLimiter, {
  userMessageRate: {
    kind: "token bucket",
    rate: 20,
    period: MINUTE,
    capacity: 20,
  },
  globalMessageRate: {
    kind: "token bucket",
    rate: 500,
    period: MINUTE,
    capacity: 500,
    shards: 5,
  },
  userUploadRate: {
    kind: "token bucket",
    rate: 30,
    period: MINUTE,
    capacity: 30,
  },
  globalUploadRate: {
    kind: "token bucket",
    rate: 1000,
    period: MINUTE,
    capacity: 1000,
    shards: 5,
  },
});

export const checkMessageRateLimit = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await rateLimiter.limit(ctx, "userMessageRate", {
      key: userId,
      throws: true,
    });
    await rateLimiter.limit(ctx, "globalMessageRate", { throws: true });
  },
});

export const checkUploadRateLimit = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await rateLimiter.limit(ctx, "userUploadRate", {
      key: userId,
      throws: true,
    });
    await rateLimiter.limit(ctx, "globalUploadRate", { throws: true });
  },
});
