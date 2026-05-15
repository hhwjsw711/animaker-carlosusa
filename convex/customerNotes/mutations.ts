import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { resolveWorkspaceUserId, assertNotStaff } from "../lib/workspace";

export const createNote = mutation({
  args: {
    customerId: v.id("customers"),
    content: v.string(),
  },
  handler: async (ctx, { customerId, content }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== effectiveUserId) {
      throw new Error("Customer not found");
    }

    const trimmed = content.trim();
    if (!trimmed) throw new Error("Content is required");

    return await ctx.db.insert("customerNotes", {
      userId: effectiveUserId,
      customerId,
      content: trimmed,
      createdAt: Date.now(),
    });
  },
});

export const updateNote = mutation({
  args: {
    noteId: v.id("customerNotes"),
    content: v.string(),
  },
  handler: async (ctx, { noteId, content }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const note = await ctx.db.get(noteId);
    if (!note || note.userId !== effectiveUserId) {
      throw new Error("Note not found");
    }

    const trimmed = content.trim();
    if (!trimmed) throw new Error("Content is required");

    await ctx.db.patch(noteId, {
      content: trimmed,
      updatedAt: Date.now(),
    });
  },
});

export const deleteNote = mutation({
  args: {
    noteId: v.id("customerNotes"),
  },
  handler: async (ctx, { noteId }) => {
    const ws = await resolveWorkspaceUserId(ctx);
    const { effectiveUserId } = ws;
    assertNotStaff(ws);

    const note = await ctx.db.get(noteId);
    if (!note || note.userId !== effectiveUserId) {
      throw new Error("Note not found");
    }

    await ctx.db.delete(noteId);
  },
});

export const createNoteInternal = internalMutation({
  args: {
    userId: v.id("users"),
    customerId: v.id("customers"),
    content: v.string(),
  },
  handler: async (ctx, { userId, customerId, content }) => {
    const customer = await ctx.db.get(customerId);
    if (!customer || customer.userId !== userId) {
      throw new Error("Customer not found");
    }

    const trimmed = content.trim();
    if (!trimmed) throw new Error("Content is required");

    return await ctx.db.insert("customerNotes", {
      userId,
      customerId,
      content: trimmed,
      createdAt: Date.now(),
    });
  },
});

export const updateNoteInternal = internalMutation({
  args: {
    userId: v.id("users"),
    noteId: v.id("customerNotes"),
    content: v.string(),
  },
  handler: async (ctx, { userId, noteId, content }) => {
    const note = await ctx.db.get(noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found");
    }

    const trimmed = content.trim();
    if (!trimmed) throw new Error("Content is required");

    await ctx.db.patch(noteId, {
      content: trimmed,
      updatedAt: Date.now(),
    });
  },
});

export const deleteNoteInternal = internalMutation({
  args: {
    userId: v.id("users"),
    noteId: v.id("customerNotes"),
  },
  handler: async (ctx, { userId, noteId }) => {
    const note = await ctx.db.get(noteId);
    if (!note || note.userId !== userId) {
      throw new Error("Note not found");
    }

    await ctx.db.delete(noteId);
  },
});
