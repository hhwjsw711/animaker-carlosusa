import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/** Check if the user cancelled the stream for this thread.
 *  Call before expensive external API calls (image gen, web search). */
export async function isCancelled(
  ctx: { runQuery: ActionCtx["runQuery"] },
  threadId: string | undefined,
): Promise<boolean> {
  if (!threadId) return false;
  const status = await ctx.runQuery(
    internal.chat.queries.getThreadStatusInternal,
    { threadId: threadId as Id<"threads"> },
  );
  return !!status?.cancelledAt;
}

/** Wrap a promise with a timeout. Rejects with a descriptive error on expiry. */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

export const TOOL_TIMEOUT_IMAGE = 60_000;
export const TOOL_TIMEOUT_WEB = 30_000;
