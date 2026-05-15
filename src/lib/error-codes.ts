/** Error codes shared between backend and frontend.
 *  Backend throws `new Error(ERROR_CODES.XXX)`,
 *  frontend matches via `message.startsWith(code)`. */
export const ERROR_CODES = {
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
  RATE_LIMIT: "RATE_LIMIT",
  MODEL_TIMEOUT: "MODEL_TIMEOUT",
  ACTION_TIMEOUT: "ACTION_TIMEOUT",
  GENERATION_FAILED: "GENERATION_FAILED",
} as const;
