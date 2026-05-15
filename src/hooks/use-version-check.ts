import { useEffect } from "react";

declare const __APP_VERSION__: string;

const POLL_INTERVAL_MS = 15_000;

async function checkAndReload() {
  if (document.visibilityState === "hidden") return;

  try {
    const res = await fetch("/version.json?t=" + Date.now());
    if (!res.ok) return;
    const { version } = await res.json();

    if (version && version !== __APP_VERSION__) {
      window.location.reload();
    }
  } catch {
    // Network error — skip silently
  }
}

export function useVersionCheck() {
  useEffect(() => {
    const id = setInterval(checkAndReload, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") checkAndReload();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", checkAndReload);
    window.addEventListener("focus", checkAndReload);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", checkAndReload);
      window.removeEventListener("focus", checkAndReload);
    };
  }, []);
}
