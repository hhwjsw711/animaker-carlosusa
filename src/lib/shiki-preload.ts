import { code } from "@streamdown/code";

/**
 * Pre-initialize Shiki's WASM engine during browser idle time.
 * Calling highlight() with an empty string triggers the lazy singleton creation.
 * This avoids a 100-300ms stall on mobile when the first code block appears.
 */
export function preloadShiki(): void {
  const init = () => {
    try {
      code.highlight(
        { code: " ", language: "javascript" as never, themes: ["github-light", "github-dark"] },
        () => {
          /* WASM loaded — nothing to do */
        },
      );
    } catch {
      /* Best-effort — swallow errors */
    }
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(init, { timeout: 3000 });
  } else {
    setTimeout(init, 1000);
  }
}
