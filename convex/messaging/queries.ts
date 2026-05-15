import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";

export const listWhatsAppMessages = query({
  args: {
    customerId: v.id("customers"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { customerId, paginationOpts }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== ws.effectiveUserId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_customerId_and_channel_and_createdAt", (q) =>
        q.eq("customerId", customerId).eq("channel", "whatsapp"),
      )
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const findCustomerByPhone = internalQuery({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, { phone }) => {
    const digits = phone.replace(/\D/g, "");

    // Try with + prefix (e.g., "5511999999999" → "+5511999999999")
    const withPlus = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", `+${digits}`))
      .first();
    if (withPlus) return withPlus;

    // Try digits only
    const digitsOnly = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", digits))
      .first();
    if (digitsOnly) return digitsOnly;

    // Try without country code (e.g., "5511976910760" → "11976910760")
    if (digits.length >= 12 && digits.startsWith("55")) {
      const withoutCountry = digits.slice(2);
      const withoutCountryPlus = await ctx.db
        .query("customers")
        .withIndex("by_phone", (q) => q.eq("phone", `+${withoutCountry}`))
        .first();
      if (withoutCountryPlus) return withoutCountryPlus;

      const withoutCountryDigits = await ctx.db
        .query("customers")
        .withIndex("by_phone", (q) => q.eq("phone", withoutCountry))
        .first();
      if (withoutCountryDigits) return withoutCountryDigits;
    }

    return null;
  },
});

export const getMessageById = internalQuery({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, { messageId }) => {
    return await ctx.db.get(messageId);
  },
});

export const findByExternalId = internalQuery({
  args: {
    externalId: v.string(),
  },
  handler: async (ctx, { externalId }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_externalId", (q) => q.eq("externalId", externalId))
      .first();
  },
});
