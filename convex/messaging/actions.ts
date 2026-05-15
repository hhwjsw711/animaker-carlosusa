import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";
import {
  sendWhatsAppMessage,
  sendWhatsAppMedia,
  getWarmUpDailyLimit,
} from "../tools/messaging/client";
import type { QuotedMessage } from "../tools/messaging/client";
import { hashBody } from "../tools/messaging/helpers";

/**
 * Normalize phone to E.164 digits (no +).
 * Brazilian numbers (10-11 digits) get country code 55 prepended.
 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export const sendTextMessage = action({
  args: {
    customerId: v.id("customers"),
    body: v.string(),
    quotedMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, { customerId, body, quotedMessageId }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");
    const ws = await ctx.runQuery(internal.workspace.queries.resolveForAction, { authenticatedUserId: authUserId });
    if (ws.collaboratorRole === "staff") throw new Error("Insufficient permissions");
    const userId = ws.effectiveUserId as Id<"users">;

    const customer = await ctx.runQuery(
      internal.customers.queries.getCustomerInternal,
      { customerId, userId },
    );
    if (!customer) throw new Error("Customer not found");
    if (!customer.phone) throw new Error("Customer has no phone number");

    const config = await ctx.runQuery(
      internal.messagingConfig.queries.getMessagingConfigByUserId,
      { userId },
    );
    if (
      !config?.evolutionInstance ||
      !config?.evolutionApiKey ||
      config?.evolutionStatus !== "connected"
    ) {
      throw new Error("WhatsApp is not connected");
    }

    const today = new Date().toISOString().slice(0, 10);
    const warmUpDay = config.warmUpDay ?? 1;
    const dailyLimit = getWarmUpDailyLimit(warmUpDay);
    const messagesToday =
      config.messagesTodayDate === today ? (config.messagesToday ?? 0) : 0;

    if (messagesToday >= dailyLimit) {
      throw new Error("Daily message limit reached");
    }

    const instanceName = config.evolutionInstance!;
    const apiKey = config.evolutionApiKey!;
    const fromPhone = config.evolutionPhone ?? instanceName;

    const phone = normalizePhone(customer.phone);
    const idempotencyKey = `${customerId}:${phone}:${await hashBody(body)}:${today}`;

    // Build quoted message for reply
    let quoted: QuotedMessage | undefined;
    if (quotedMessageId) {
      const quotedMsg = await ctx.runQuery(
        internal.messaging.queries.getMessageById,
        { messageId: quotedMessageId },
      );
      if (quotedMsg?.externalId) {
        const isFromMe = quotedMsg.direction === "outbound";
        const remoteJid = `${phone}@s.whatsapp.net`;
        quoted = {
          key: {
            remoteJid,
            fromMe: isFromMe,
            id: quotedMsg.externalId,
          },
          message: {
            conversation: quotedMsg.body,
          },
        };
      }
    }

    const messageId = await ctx.runMutation(
      internal.messaging.mutations.reserveMessage,
      {
        userId,
        customerId,
        channel: "whatsapp",
        to: phone,
        from: fromPhone,
        body,
        quotedMessageId,
        idempotencyKey,
      },
    );

    if (!messageId) return { success: true, duplicate: true };

    try {
      const result = await sendWhatsAppMessage(
        instanceName,
        apiKey,
        phone,
        body,
        quoted,
      );

      await ctx.runMutation(
        internal.messaging.mutations.updateMessageToSent,
        { messageId, externalId: result.key.id },
      );

      await ctx.runMutation(
        internal.messagingConfig.mutations.incrementDailyMessages,
        { userId, date: today },
      );

      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send";
      console.error(`[sendTextMessage] Failed:`, errorMsg);
      await ctx.runMutation(
        internal.messaging.mutations.updateMessageToFailed,
        { messageId, error: errorMsg },
      );
      throw err;
    }
  },
});

export const sendMediaMessage = action({
  args: {
    customerId: v.id("customers"),
    storageId: v.id("_storage"),
    mediaType: v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("document"),
      v.literal("audio"),
    ),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, { customerId, storageId, mediaType, caption }) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) throw new Error("Not authenticated");
    const ws = await ctx.runQuery(internal.workspace.queries.resolveForAction, { authenticatedUserId: authUserId });
    if (ws.collaboratorRole === "staff") throw new Error("Insufficient permissions");
    const userId = ws.effectiveUserId as Id<"users">;

    const customer = await ctx.runQuery(
      internal.customers.queries.getCustomerInternal,
      { customerId, userId },
    );
    if (!customer) throw new Error("Customer not found");
    if (!customer.phone) throw new Error("Customer has no phone number");

    const config = await ctx.runQuery(
      internal.messagingConfig.queries.getMessagingConfigByUserId,
      { userId },
    );
    if (
      !config?.evolutionInstance ||
      !config?.evolutionApiKey ||
      config?.evolutionStatus !== "connected"
    ) {
      throw new Error("WhatsApp is not connected");
    }

    const today = new Date().toISOString().slice(0, 10);
    const warmUpDay = config.warmUpDay ?? 1;
    const dailyLimit = getWarmUpDailyLimit(warmUpDay);
    const messagesToday =
      config.messagesTodayDate === today ? (config.messagesToday ?? 0) : 0;

    if (messagesToday >= dailyLimit) {
      throw new Error("Daily message limit reached");
    }

    const mediaUrl = await ctx.storage.getUrl(storageId);
    if (!mediaUrl) throw new Error("File not found in storage");

    const instanceName = config.evolutionInstance!;
    const apiKey = config.evolutionApiKey!;
    const fromPhone = config.evolutionPhone ?? instanceName;

    const phone = normalizePhone(customer.phone);
    const body = caption || `[media:${mediaType}]`;
    const idempotencyKey = `${customerId}:${phone}:${await hashBody(body)}:${storageId}:${today}`;

    const messageId = await ctx.runMutation(
      internal.messaging.mutations.reserveMessage,
      {
        userId,
        customerId,
        channel: "whatsapp",
        to: phone,
        from: fromPhone,
        body,
        mediaUrl,
        idempotencyKey,
      },
    );

    if (!messageId) return { success: true, duplicate: true };

    try {
      const result = await sendWhatsAppMedia(
        instanceName,
        apiKey,
        phone,
        mediaUrl,
        mediaType,
        caption,
      );

      await ctx.runMutation(
        internal.messaging.mutations.updateMessageToSent,
        { messageId, externalId: result.key.id },
      );

      await ctx.runMutation(
        internal.messagingConfig.mutations.incrementDailyMessages,
        { userId, date: today },
      );

      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send";
      console.error(`[sendMediaMessage] Failed:`, errorMsg);
      await ctx.runMutation(
        internal.messaging.mutations.updateMessageToFailed,
        { messageId, error: errorMsg },
      );
      throw err;
    }
  },
});
