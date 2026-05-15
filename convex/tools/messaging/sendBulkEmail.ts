import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { escapeHtml, EMAIL_HTML_TEMPLATE } from "./helpers";
import type { ToolExecutionContext } from "../index";

interface MessageCallCounter {
  messageCalls: number;
}

export function createSendBulkEmailTool(
  counter: MessageCallCounter,
  maxCalls: number,
  execCtx?: ToolExecutionContext,
) {
  const isScheduled = execCtx?.mode === "scheduled";
  return createTool({
    description: isScheduled
      ? "Send an email to a customer by ID. You are running as an automated scheduled task — send directly without waiting for approval. WORKFLOW: Use listCustomers first to find customer IDs and email addresses."
      : "Send an email to a customer by ID. Use for formal communications, reports, or detailed content. IMPORTANT: Always show the draft to the user and wait for explicit approval before calling this tool. You can call this tool multiple times to send to different customers. WORKFLOW: Use listCustomers first to find customer IDs and email addresses.",
    inputSchema: z.object({
      customerId: z.string().describe("The customer ID to send the email to"),
      to: z.string().email().describe("Recipient email address"),
      subject: z.string().max(200).describe("Email subject line"),
      body: z
        .string()
        .max(10_000)
        .describe(
          "Email body in plain text. Will be rendered into an HTML template.",
        ),
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

        const apiKey = config?.resendApiKey ?? process.env.AUTH_RESEND_KEY;
        if (!apiKey) {
          return {
            error: true,
            message:
              "Email service is not configured. Ask the user to set up their Resend API key in messaging settings.",
          };
        }

        const from =
          config?.emailFrom ?? process.env.AUTH_EMAIL_FROM;
        if (!from) {
          return {
            error: true,
            message:
              "Email sender address is not configured. Set it in messaging settings.",
          };
        }

        const today = new Date().toISOString().slice(0, 10);
        const idempotencyKey = `email:${input.customerId}:${input.to}:${input.subject}:${today}`;

        const messageId = await ctx.runMutation(
          internal.messaging.mutations.reserveMessage,
          {
            userId,
            customerId: input.customerId as Id<"customers">,
            channel: "email",
            to: input.to,
            from,
            subject: input.subject,
            body: input.body,
            idempotencyKey,
          },
        );

        if (!messageId) {
          return {
            success: true,
            message: "Email already sent.",
            channel: "email",
            to: input.to,
            customerName: customer.name,
          };
        }

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from,
              to: input.to,
              subject: input.subject,
              html: EMAIL_HTML_TEMPLATE(escapeHtml(input.body)),
            }),
          });

          if (!res.ok) {
            const errorBody = await res.text().catch(() => "");
            await ctx.runMutation(
              internal.messaging.mutations.updateMessageToFailed,
              { messageId, error: `Resend API error: ${res.status}` },
            );
            console.error("Resend API error:", res.status, errorBody);
            return { error: true, message: `Failed to send email to ${input.to} (${res.status}).` };
          }

          const data = (await res.json()) as { id: string };

          await ctx.runMutation(
            internal.messaging.mutations.updateMessageToSent,
            { messageId, externalId: data.id },
          );

          return {
            success: true,
            messageId: data.id,
            channel: "email",
            to: input.to,
            customerName: customer.name,
          };
        } catch (sendErr) {
          await ctx.runMutation(
            internal.messaging.mutations.updateMessageToFailed,
            {
              messageId,
              error:
                sendErr instanceof Error
                  ? sendErr.message
                  : "Failed to send email",
            },
          );
          throw sendErr;
        }
      } catch (err) {
        console.error("Failed to send email:", err);
        const message =
          err instanceof Error ? err.message : "Failed to send email";
        return { error: true, message };
      }
    },
  });
}
