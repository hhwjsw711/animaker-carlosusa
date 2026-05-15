import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { sendWhatsAppMessage, sendWhatsAppMedia, getWarmUpDailyLimit } from "./client";
import { hashBody } from "./helpers";
import type { ToolExecutionContext } from "../index";

interface MessageCallCounter {
  messageCalls: number;
}

export function createSendBulkWhatsAppTool(
  counter: MessageCallCounter,
  maxCalls: number,
  execCtx?: ToolExecutionContext,
) {
  const isScheduled = execCtx?.mode === "scheduled";
  return createTool({
    description: isScheduled
      ? "Send a WhatsApp message to a customer by ID. You are running as an automated scheduled task — send directly without waiting for approval. Supports optional image attachment via imageUrl. WORKFLOW: Use listCustomers first to find customer IDs and phone numbers (must include country code, e.g. 5511999887766)."
      : "Send a WhatsApp message to a customer by ID. IMPORTANT: Always show the draft to the user and wait for explicit approval before calling this tool. Never send without confirmation. You can call this tool multiple times to send to different customers. Supports optional image attachment via imageUrl. WORKFLOW: Use listCustomers first to find customer IDs and phone numbers (must include country code, e.g. 5511999887766).",
    inputSchema: z.object({
      customerId: z.string().describe("The customer ID to send the message to"),
      to: z
        .string()
        .regex(/^\+?\d{10,15}$/)
        .describe(
          "Recipient phone number with country code (e.g. 5511999887766)",
        ),
      body: z.string().max(4_096).describe("WhatsApp message body (used as caption when sending an image)"),
      imageUrl: z.string().url().optional().describe("Optional image URL to send as media. Use the URL from a previous generateImage/editImage result."),
    }),
    execute: async (ctx, input) => {
      counter.messageCalls++;
      if (counter.messageCalls > maxCalls) {
        return {
          error: true,
          message: `Bulk message send limit reached (${maxCalls}). You cannot send more messages in this conversation turn.`,
        };
      }

      try {
        if (!ctx.userId) {
          return { error: true, message: "Not authenticated." };
        }
        const userId = ctx.userId as Id<"users">;

        const customer = await ctx.runQuery(
          internal.customers.queries.getCustomerInternal,
          { customerId: input.customerId as Id<"customers">, userId },
        );
        if (!customer) {
          return { error: true, message: `Customer not found: ${input.customerId}` };
        }

        const config = await ctx.runQuery(
          internal.messagingConfig.queries.getMessagingConfigByUserId,
          { userId },
        );

        if (
          !config?.evolutionInstance ||
          !config?.evolutionApiKey ||
          config?.evolutionStatus !== "connected"
        ) {
          return {
            error: true,
            message:
              "WhatsApp is not connected. Ask the user to connect their WhatsApp in settings by scanning the QR code.",
          };
        }

        // ANTI-BAN: enforce warm-up daily limit
        const today = new Date().toISOString().slice(0, 10);
        const warmUpDay = config.warmUpDay ?? 1;
        const dailyLimit = getWarmUpDailyLimit(warmUpDay);
        const messagesToday =
          config.messagesTodayDate === today
            ? (config.messagesToday ?? 0)
            : 0;

        if (messagesToday >= dailyLimit) {
          return {
            error: true,
            message: `Daily message limit reached (${dailyLimit} messages for warm-up day ${warmUpDay}). The limit will increase automatically each day. Try again tomorrow.`,
          };
        }

        // Normalize phone
        const phone = input.to.replace(/\D/g, "");
        const idempotencyKey = `${input.customerId}:${phone}:${await hashBody(input.body)}:${today}`;

        // ATOMIC: check + insert in a single mutation (no race condition)
        const messageId = await ctx.runMutation(
          internal.messaging.mutations.reserveMessage,
          {
            userId,
            customerId: input.customerId as Id<"customers">,
            channel: "whatsapp",
            to: phone,
            from: config.evolutionPhone ?? config.evolutionInstance,
            body: input.body,
            ...(input.imageUrl ? { mediaUrl: input.imageUrl } : {}),
            idempotencyKey,
          },
        );

        // If null, message was already reserved/sent (duplicate)
        if (!messageId) {
          return {
            success: true,
            message: "Message already sent.",
            channel: "whatsapp",
            to: phone,
            customerName: customer.name,
          };
        }

        // Send via Evolution API
        try {
          const result = input.imageUrl
            ? await sendWhatsAppMedia(
                config.evolutionInstance,
                config.evolutionApiKey,
                phone,
                input.imageUrl,
                "image",
                input.body,
              )
            : await sendWhatsAppMessage(
                config.evolutionInstance,
                config.evolutionApiKey,
                phone,
                input.body,
              );

          // Update to "sent"
          await ctx.runMutation(
            internal.messaging.mutations.updateMessageToSent,
            { messageId, externalId: result.key.id },
          );

          // ANTI-BAN: increment daily counter
          await ctx.runMutation(
            internal.messagingConfig.mutations.incrementDailyMessages,
            { userId, date: today },
          );

          return {
            success: true,
            messageId: result.key.id,
            channel: "whatsapp",
            to: phone,
            customerName: customer.name,
          };
        } catch (sendErr) {
          // Mark as failed if Evolution API call fails
          await ctx.runMutation(
            internal.messaging.mutations.updateMessageToFailed,
            {
              messageId,
              error:
                sendErr instanceof Error
                  ? sendErr.message
                  : "Failed to send",
            },
          );
          throw sendErr;
        }
      } catch (err) {
        console.error("Failed to send WhatsApp message:", err);
        const message =
          err instanceof Error
            ? err.message
            : "Failed to send WhatsApp message";
        return { error: true, message };
      }
    },
  });
}
