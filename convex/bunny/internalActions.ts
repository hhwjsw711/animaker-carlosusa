import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { deleteFromBunny, deleteManyFromBunny } from "./delete";

/**
 * Best-effort background delete. Schedule from a mutation with
 * `ctx.scheduler.runAfter(0, internal.bunny.internalActions.deletePath, { path })`
 * so the mutation transaction doesn't block on the HTTP call to Bunny.
 */
export const deletePath = internalAction({
  args: { path: v.string() },
  handler: async (_ctx, { path }) => {
    await deleteFromBunny(path).catch((err) => {
      console.error(`[bunny] background delete failed for ${path}:`, err);
    });
  },
});

export const deletePaths = internalAction({
  args: { paths: v.array(v.string()) },
  handler: async (_ctx, { paths }) => {
    await deleteManyFromBunny(paths);
  },
});
