import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";
import { publicUrl } from "../bunny/url";

export const getCustomerInternal = internalQuery({
  args: { customerId: v.id("customers"), userId: v.optional(v.id("users")) },
  handler: async (ctx, { customerId, userId }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer) return null;
    if (userId && customer.userId !== userId) return null;
    return customer;
  },
});

export const listCustomers = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const userId = ws.effectiveUserId;

    return await ctx.db
      .query("customers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const getCustomer = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, { customerId }) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;
    const userId = ws.effectiveUserId;

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== userId) return null;

    const photoUrl = customer.photoBunnyPath
      ? publicUrl(customer.photoBunnyPath, { width: 256, format: "webp" })
      : null;

    return { ...customer, photoUrl };
  },
});

export const listCustomersInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);

    return customers.map((c) => ({
      _id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      birthDate: c.birthDate,
      color: c.color,
      gender: c.gender,
      document: c.document,
      documentType: c.documentType,
      company: c.company,
      jobTitle: c.jobTitle,
      city: c.city,
      state: c.state,
      country: c.country,
    }));
  },
});

export const searchCustomersInternal = internalQuery({
  args: { userId: v.id("users"), search: v.string() },
  handler: async (ctx, { userId, search }) => {
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500);

    const term = search.toLowerCase();
    const filtered = customers.filter((c) => {
      return (
        c.name.toLowerCase().includes(term) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term)) ||
        (c.document && c.document.includes(term)) ||
        (c.company && c.company.toLowerCase().includes(term)) ||
        (c.city && c.city.toLowerCase().includes(term))
      );
    });

    return filtered.map((c) => ({
      _id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      birthDate: c.birthDate,
      color: c.color,
      gender: c.gender,
      document: c.document,
      documentType: c.documentType,
      company: c.company,
      jobTitle: c.jobTitle,
      city: c.city,
      state: c.state,
      country: c.country,
    }));
  },
});
