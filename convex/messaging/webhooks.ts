import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";

// ─── Evolution API Webhook Handler ───
// Receives events: qrcode.updated, connection.update, messages.upsert

interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: Record<string, unknown>;
  apikey?: string;
}

// ─── Media type detection ───
// Evolution API normalizes extendedTextMessage → conversation,
// so we only need to handle non-text message types here.
const MEDIA_TYPE_MAP: Record<string, string> = {
  imageMessage: "image",
  audioMessage: "audio",
  videoMessage: "video",
  documentMessage: "document",
  stickerMessage: "sticker",
  locationMessage: "location",
  contactMessage: "contact",
  ptvMessage: "video",
};

function extractMessageBody(
  message: Record<string, unknown> | undefined,
  messageType?: string,
): string | undefined {
  if (!message) return undefined;

  // Text messages (Evolution API normalizes extendedTextMessage → conversation)
  if (message.conversation) return message.conversation as string;
  if (
    typeof message.extendedTextMessage === "object" &&
    message.extendedTextMessage !== null
  ) {
    const text = (message.extendedTextMessage as { text?: string }).text;
    if (text) return text;
  }

  // Media messages — extract caption if available, otherwise use type tag
  for (const [msgKey, mediaType] of Object.entries(MEDIA_TYPE_MAP)) {
    if (typeof message[msgKey] === "object" && message[msgKey] !== null) {
      const media = message[msgKey] as {
        caption?: string;
        fileName?: string;
        title?: string;
      };
      if (media.caption) return media.caption;
      if (media.fileName) return `[media:${mediaType}:${media.fileName}]`;
      if (media.title) return `[media:${mediaType}:${media.title}]`;
      return `[media:${mediaType}]`;
    }
  }

  // Fallback: use messageType from Evolution API if available
  if (messageType && messageType !== "conversation") {
    const type = messageType.replace("Message", "");
    return `[media:${type}]`;
  }

  return undefined;
}

export const evolutionWebhook = httpAction(async (ctx, request) => {
  let payload: EvolutionWebhookPayload;
  try {
    payload = (await request.json()) as EvolutionWebhookPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { event, instance, data } = payload;
  if (!event || !instance) {
    return new Response("OK", { status: 200 });
  }

  // Find which user owns this instance — this is the primary auth check.
  // Only instances registered in our database are accepted.
  const config = await ctx.runQuery(
    internal.messagingConfig.queries.findConfigByInstance,
    { instanceName: instance },
  );

  if (!config) {
    return new Response("OK", { status: 200 });
  }

  // Validate that a non-empty apikey was provided.
  // Evolution API may send its own instance hash key which differs from the
  // one we store, so we rely on instance ownership as the primary auth.
  const webhookApiKey = payload.apikey ?? request.headers.get("apikey") ?? "";
  if (!webhookApiKey) {
    return new Response("OK", { status: 200 });
  }

  // Normalize event name: Evolution API sends "messages.upsert" (lowercase dots),
  // convert to "MESSAGES_UPSERT" (uppercase underscores) for the switch
  const normalizedEvent = event.replace(/[.-]/g, "_").toUpperCase();

  switch (normalizedEvent) {
    case "CONNECTION_UPDATE": {
      const state = (data as { state?: string }).state;
      if (state === "open") {
        // Extract phone from wuid (WhatsApp User ID)
        const owner = (data as { wuid?: string }).wuid;
        const phone = owner ? owner.split("@")[0] : undefined;

        await ctx.runMutation(
          internal.messagingConfig.mutations.updateEvolutionStatus,
          { userId: config.userId, status: "connected", phone },
        );
      } else if (state === "close") {
        await ctx.runMutation(
          internal.messagingConfig.mutations.updateEvolutionStatus,
          { userId: config.userId, status: "disconnected" },
        );
      }
      break;
    }

    case "MESSAGES_UPSERT": {
      // Evolution API sends one webhook per message (data is a single object)
      const messages = Array.isArray(data) ? data : [data];

      for (const msg of messages) {
        const msgData = msg as {
          key?: { fromMe?: boolean; remoteJid?: string; id?: string };
          message?: Record<string, unknown>;
          messageType?: string;
        };

        // Skip outbound messages (sent by us)
        if (msgData.key?.fromMe) continue;

        const remoteJid = msgData.key?.remoteJid;
        if (!remoteJid || remoteJid.includes("@g.us")) continue; // Skip groups

        const senderPhone = remoteJid.split("@")[0];
        const messageId = msgData.key?.id;
        const body = extractMessageBody(
          msgData.message,
          msgData.messageType,
        );

        if (!body || !messageId) continue;

        // Deduplicate: skip if we already have this message
        const existing = await ctx.runQuery(
          internal.messaging.queries.findByExternalId,
          { externalId: messageId },
        );
        if (existing) continue;

        // Find customer by phone
        const customer = await ctx.runQuery(
          internal.messaging.queries.findCustomerByPhone,
          { phone: senderPhone },
        );

        if (customer && customer.userId === config.userId) {
          await ctx.runMutation(internal.messaging.mutations.logMessage, {
            userId: config.userId,
            customerId: customer._id,
            channel: "whatsapp",
            direction: "inbound",
            to: config.evolutionPhone ?? instance,
            from: senderPhone,
            body,
            status: "received",
            externalId: messageId,
          });
        }
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
});
