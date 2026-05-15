// ─── Streaming Timeouts ─���───────────────────────────────────────────────────

/** Max time (ms) to consider a stream active before auto-cancelling on the frontend.
 *  Must be < backend's 180 s timeout so the frontend catches stuck streams first. */
export const FRONTEND_STREAM_TIMEOUT = 120_000;

/** Client-side safety net: if the Convex action doesn't resolve within this time,
 *  reject so the UI unblocks. Must be > backend's 180 s timeout (TIMEOUT_MS in
 *  convex/chat/actions.ts) to allow the server to finish or timeout first. */
export const ACTION_TIMEOUT = 200_000;

/** If isLoading is true but no message data changes within this window,
 *  consider the stream stale and auto-recover. Set high enough to tolerate
 *  extended thinking / reasoning phases (effort: "high" can think for 30+ s). */
export const STALE_STREAM_TIMEOUT = 60_000;

// ─── UI Constants ─────────��─────────────────────────────────────────────────

/** Interval (ms) between streaming text renders to avoid per-token reflow cascades. */
export const STREAMING_THROTTLE_MS = 60;

/** Pixel threshold from bottom to consider the viewport "at bottom" for auto-scroll. */
export const SCROLL_THRESHOLD_PX = 40;

/** Max entries in the module-level virtualizer size cache (LRU eviction). */
export const SIZE_CACHE_MAX = 500;

/** Safety timeout (ms) for thread creation to prevent leaked refs on failure. */
export const THREAD_CREATION_TIMEOUT_MS = 15_000;

/** Max prompt length (chars) before truncation. */
export const MAX_PROMPT_LENGTH = 10_000;
