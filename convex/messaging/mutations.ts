import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const logMessage = internalMutation({
  args: {
    userId: v.id("users"),
    customerId: v.id("customers"),
    channel: v.union(v.literal("email"), v.literal("whatsapp")),
    direction: v.union(v.literal("outbound"), v.literal("inbound")),
    to: v.string(),
    from: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
    mediaUrl: v.optional(v.string()),
    status: v.union(
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("undelivered"),
      v.literal("received"),
    ),
    externalId: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Atomic check-and-insert: if idempotencyKey already exists, returns null.
 * Otherwise inserts the message and returns its ID.
 * Mutations in Convex are transactional — no race condition possible.
 */
export const reserveMessage = internalMutation({
  args: {
    userId: v.id("users"),
    customerId: v.id("customers"),
    channel: v.union(v.literal("email"), v.literal("whatsapp")),
    to: v.string(),
    from: v.string(),
    subject: v.optional(v.string()),
    body: v.string(),
    mediaUrl: v.optional(v.string()),
    quotedMessageId: v.optional(v.id("messages")),
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already exists (atomic within this mutation)
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_idempotencyKey", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey),
      )
      .first();

    if (existing) return null;

    // Insert with status "queued"
    return await ctx.db.insert("messages", {
      ...args,
      direction: "outbound" as const,
      status: "queued" as const,
      idempotencyKey: args.idempotencyKey,
      createdAt: Date.now(),
    });
  },
});

export const updateMessageToSent = internalMutation({
  args: {
    messageId: v.id("messages"),
    externalId: v.string(),
  },
  handler: async (ctx, { messageId, externalId }) => {
    await ctx.db.patch(messageId, { status: "sent", externalId });
  },
});

export const updateMessageToFailed = internalMutation({
  args: {
    messageId: v.id("messages"),
    error: v.string(),
  },
  handler: async (ctx, { messageId, error }) => {
    await ctx.db.patch(messageId, { status: "failed", error });
  },
});
