import { query } from "../_generated/server";
import { tryResolveWorkspaceUserId } from "../lib/workspace";

export const getMyStorageUsage = query({
  args: {},
  handler: async (ctx) => {
    const ws = await tryResolveWorkspaceUserId(ctx);
    if (!ws) return null;

    // Customer files — already have size in the table
    const customerFiles = await ctx.db
      .query("customerFiles")
      .withIndex("by_userId_and_customerId", (q) => q.eq("userId", ws.effectiveUserId))
      .take(1000);

    const filesBytes = customerFiles.reduce((sum, f) => sum + f.size, 0);

    // Chat attachments — direct index lookup (no thread join needed)
    const attachments = await ctx.db
      .query("chatAttachments")
      .withIndex("by_userId", (q) => q.eq("userId", ws.effectiveUserId))
      .take(1000);

    const attachmentsBytes = attachments.reduce((sum, a) => sum + (a.size ?? 0), 0);

    // User and customer photos are stored via Bunny, not Convex storage.
    // Current usage accounting tracks Convex-managed files and chat attachments only.
    return {
      files: { count: customerFiles.length, totalBytes: filesBytes },
      attachments: { count: attachments.length, totalBytes: attachmentsBytes },
      photos: { count: 0, totalBytes: 0 },
      total: filesBytes + attachmentsBytes,
    };
  },
});
