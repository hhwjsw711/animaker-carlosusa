import { httpRouter } from "convex/server";
import { registerRoutes } from "@convex-dev/stripe";
import type Stripe from "stripe";
import { auth } from "./auth";
import { components, internal } from "./_generated/api";
import { evolutionWebhook } from "./messaging/webhooks";
import { upload as bunnyUpload } from "./bunny/httpUpload";

const http = httpRouter();
auth.addHttpRoutes(http);

http.route({
  path: "/webhooks/evolution",
  method: "POST",
  handler: evolutionWebhook,
});

http.route({
  path: "/api/bunny/upload",
  method: "POST",
  handler: bunnyUpload,
});

http.route({
  path: "/api/bunny/upload",
  method: "OPTIONS",
  handler: bunnyUpload,
});

// ─── Stripe webhooks ───────────────────────────────────────────────────────
// Endpoint: https://<deployment>.convex.site/webhooks/stripe
// Signature verification is handled automatically by registerRoutes using
// STRIPE_WEBHOOK_SECRET from the Convex env. The component syncs the event
// to its own tables first, then calls our handlers for app-specific logic.

registerRoutes(http, components.stripe, {
  webhookPath: "/webhooks/stripe",
  events: {
    "checkout.session.completed": async (ctx, event) => {
      const session = event.data.object;
      // Only handle one-time credit pack purchases here. Subscription
      // fulfillment runs through customer.subscription.created/updated.
      if (session.mode !== "payment") return;

      const metadata = session.metadata ?? {};
      const rawUserId = metadata.userId;
      const credits = Number(metadata.credits ?? 0);
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;

      if (!rawUserId || !credits || !paymentIntentId) {
        console.warn(
          `[stripe-webhook] checkout.session.completed missing metadata: userId=${rawUserId} credits=${credits} pi=${paymentIntentId}`,
        );
        return;
      }

      await ctx.runMutation(
        internal.billing.stripeFulfillment.fulfillCreditPack,
        {
          rawUserId,
          credits,
          stripePaymentIntentId: paymentIntentId,
        },
      );
    },
    "customer.subscription.created": async (ctx, event) => {
      const sub = event.data.object as Stripe.Subscription;
      await ctx.runMutation(
        internal.billing.stripeFulfillment.syncSubscription,
        { stripeSubscriptionId: sub.id },
      );
    },
    "customer.subscription.updated": async (ctx, event) => {
      const sub = event.data.object as Stripe.Subscription;
      await ctx.runMutation(
        internal.billing.stripeFulfillment.syncSubscription,
        { stripeSubscriptionId: sub.id },
      );
    },
    "customer.subscription.deleted": async (ctx, event) => {
      const sub = event.data.object as Stripe.Subscription;
      await ctx.runMutation(
        internal.billing.stripeFulfillment.markSubscriptionCanceled,
        { stripeSubscriptionId: sub.id },
      );
    },
    "invoice.payment_failed": async (ctx, event) => {
      const invoice = event.data.object as Stripe.Invoice;
      const subRef = invoice.parent?.subscription_details?.subscription;
      const subId =
        typeof subRef === "string" ? subRef : subRef?.id;
      if (!subId) return;
      await ctx.runMutation(
        internal.billing.stripeFulfillment.markPastDue,
        { stripeSubscriptionId: subId },
      );
    },
  },
});

export default http;
