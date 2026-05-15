import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ANY_CATEGORY } from "../bunny/validate";
import { uploadToBunny } from "../bunny/upload";
import { deleteFromBunny } from "../bunny/delete";

/** Internal: register a bunny-uploaded file as pending (owned by user). */
export const registerPendingBunnyUploadInternal = internalMutation({
  args: { userId: v.id("users"), bunnyPath: v.string() },
  handler: async (ctx, { userId, bunnyPath }) => {
    await ctx.db.insert("pendingUploads", {
      userId,
      bunnyPath,
      createdAt: Date.now(),
    });
  },
});

/**
 * Upload a chat attachment (bytes) to Bunny and register as pending.
 * Client passes bytes + contentType; returns the bunnyPath.
 */
export const uploadChatAttachment = action({
  args: {
    bytes: v.bytes(),
    contentType: v.string(),
  },
  returns: v.object({ bunnyPath: v.string() }),
  handler: async (ctx, { bytes, contentType }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.runMutation(internal.rateLimit.mutations.checkUploadRateLimit, {
      userId,
    });

    const result = await uploadToBunny({
      bytes,
      contentType,
      size: bytes.byteLength,
      folder: `chat/${userId}`,
      allowedCategories: ANY_CATEGORY,
    });

    await ctx.runMutation(
      internal.chatAttachments.mutations.registerPendingBunnyUploadInternal,
      { userId, bunnyPath: result.path },
    );

    return { bunnyPath: result.path };
  },
});

/** Delete a Bunny-uploaded pending file that the user decided not to send. */
export const deletePendingBunnyUpload = action({
  args: { bunnyPath: v.string() },
  handler: async (ctx, { bunnyPath }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const ok: boolean = await ctx.runMutation(
      internal.chatAttachments.mutations.consumePendingBunnyUpload,
      { userId, bunnyPath },
    );
    if (!ok) return;

    await deleteFromBunny(bunnyPath).catch(() => {});
  },
});

export const consumePendingBunnyUpload = internalMutation({
  args: { userId: v.id("users"), bunnyPath: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { userId, bunnyPath }) => {
    const pending = await ctx.db
      .query("pendingUploads")
      .withIndex("by_bunnyPath", (q) => q.eq("bunnyPath", bunnyPath))
      .first();
    if (!pending || pending.userId !== userId) return false;
    await ctx.db.delete(pending._id);
    return true;
  },
});

/**
 * Move files from pendingUploads to chatAttachments (called from sendMessage action).
 * Validates that each bunnyPath belongs to the user before registering.
 */
export const registerAttachments = internalMutation({
  args: {
    userId: v.id("users"),
    threadId: v.id("threads"),
    files: v.array(
      v.object({
        bunnyPath: v.string(),
        size: v.number(),
      }),
    ),
  },
  handler: async (ctx, { userId, threadId, files }) => {
    for (const { bunnyPath, size } of files) {
      const pending = await ctx.db
        .query("pendingUploads")
        .withIndex("by_bunnyPath", (q) => q.eq("bunnyPath", bunnyPath))
        .first();

      if (!pending || pending.userId !== userId) {
        throw new Error("Unauthorized file access");
      }

      await ctx.db.delete(pending._id);
      await ctx.db.insert("chatAttachments", {
        threadId,
        userId,
        bunnyPath,
        size,
      });
    }
  },
});

/** Register an image generated server-side by an agent tool. */
export const registerGeneratedImage = internalMutation({
  args: {
    userId: v.id("users"),
    threadId: v.id("threads"),
    bunnyPath: v.string(),
    size: v.number(),
  },
  handler: async (ctx, { threadId, userId, bunnyPath, size }) => {
    await ctx.db.insert("chatAttachments", {
      threadId,
      userId,
      bunnyPath,
      size,
    });
  },
});

/** Clean up stale pending uploads that were never attached to a message. */
export const cleanupOrphanedUploads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24h
    const stale = await ctx.db
      .query("pendingUploads")
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .take(100);

    for (const pending of stale) {
      if (pending.bunnyPath) {
        await ctx.scheduler.runAfter(
          0,
          internal.bunny.internalActions.deletePath,
          { path: pending.bunnyPath },
        );
      }
      await ctx.db.delete(pending._id);
    }

    if (stale.length > 0) {
      console.log(`[cleanupOrphanedUploads] Deleted ${stale.length} stale uploads`);
    }
  },
});

/** Delete all storage files associated with a thread. */
export const deleteByThread = internalMutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const attachments = await ctx.db
      .query("chatAttachments")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .take(500);

    const bunnyPaths: string[] = [];
    for (const att of attachments) {
      if (att.bunnyPath) bunnyPaths.push(att.bunnyPath);
      await ctx.db.delete(att._id);
    }
    if (bunnyPaths.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.bunny.internalActions.deletePaths,
        { paths: bunnyPaths },
      );
    }
  },
});
