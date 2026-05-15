import { lazy, type ComponentType } from "react";

const STORAGE_PREFIX = "chunk-reload:";
const RELOAD_TTL_MS = 60_000;

function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|Loading chunk|Loading CSS chunk|Failed to fetch/i.test(
    msg,
  );
}

export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  moduleId: string,
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory().then(
      (mod) => {
        sessionStorage.removeItem(STORAGE_PREFIX + moduleId);
        return mod;
      },
      (error) => {
        if (!isChunkLoadError(error)) throw error;

        const key = STORAGE_PREFIX + moduleId;
        const prev = sessionStorage.getItem(key);

        if (prev && Date.now() - Number(prev) < RELOAD_TTL_MS) {
          throw error;
        }

        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
        return new Promise(() => {});
      },
    ),
  );
}
