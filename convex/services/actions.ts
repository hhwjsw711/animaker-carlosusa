import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { rag, type EntryId } from "../rag/setup";

function formatPrice(cents: number, currency: string): string {
  const value = (cents / 100).toFixed(2);
  return `${value} ${currency}`;
}

export const indexServiceRag = internalAction({
  args: { serviceId: v.id("services") },
  handler: async (ctx, { serviceId }) => {
    const service = await ctx.runQuery(
      internal.services.queries.getServiceForRag,
      { serviceId },
    );
    if (!service) return;

    const parts = [`Service: ${service.name}.`];
    if (service.description) parts.push(`Description: ${service.description}.`);
    if (service.categoryName) parts.push(`Category: ${service.categoryName}.`);
    if (service.price > 0) parts.push(`Price: ${formatPrice(service.price, service.currency)}.`);
    parts.push(`Billing: ${service.billingType}.`);
    if (service.recurringInterval) parts.push(`Interval: ${service.recurringInterval}.`);
    if (service.duration) parts.push(`Duration: ${service.duration}.`);
    parts.push(`Status: ${service.status}.`);

    const text = parts.join(" ");

    const { entryId } = await rag.add(ctx, {
      namespace: `services:${service.userId}`,
      key: `service:${serviceId}`,
      title: `[Service: ${service.name}]`,
      text,
    });

    const estimatedTokens = Math.ceil(text.length / 4);
    await ctx.runMutation(internal.usage.mutations.trackUsage, {
      userId: service.userId,
      source: "rag",
      ragOperation: "insert",
      estimatedTokens,
    });

    await ctx.runMutation(internal.services.mutations.updateServiceRagEntryId, {
      serviceId,
      ragEntryId: entryId,
    });
  },
});

export const deleteServiceRag = internalAction({
  args: { ragEntryId: v.string() },
  handler: async (ctx, { ragEntryId }) => {
    try {
      await rag.delete(ctx, { entryId: ragEntryId as EntryId });
    } catch {
      // Entry may already be deleted
    }
  },
});
