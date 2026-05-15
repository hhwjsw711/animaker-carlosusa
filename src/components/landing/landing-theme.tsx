import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { DARK_BG_HEX, LIGHT_BG_HEX } from "./landing-seo";

type Theme = "dark" | "light" | "system";

interface LandingThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  mounted: boolean;
}

const LandingThemeContext = createContext<LandingThemeContextType | undefined>(
  undefined,
);

function resolveSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeClass(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved = theme === "system" ? resolveSystemTheme() : theme;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  syncThemeColorMeta(resolved);
}

function syncThemeColorMeta(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const color = resolved === "dark" ? DARK_BG_HEX : LIGHT_BG_HEX;
  const existing = document.head.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  // Remove the SSR-emitted media-query variants in favor of a single explicit tag
  // that matches the user's manual selection (overrides prefers-color-scheme).
  for (const node of existing) {
    if (node.hasAttribute("media")) node.remove();
  }
  let meta = document.head.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]:not([media])',
  );
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
}

export function LandingThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  // Hydrate theme from localStorage after mount — avoids hydration mismatch
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = (localStorage.getItem("theme") as Theme | null) || "system";
    setThemeState(stored);
    setMounted(true);
  }, []);

  // React to system theme changes only while the user has "system" selected.
  // Separate effect so it re-subscribes when `theme` changes, avoiding the
  // stale-closure bug where switching away from "system" left a dead listener
  // that would still fire on OS color-scheme changes.
  useEffect(() => {
    if (typeof window === "undefined" || theme !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyThemeClass("system");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", next);
    }
    applyThemeClass(next);
  }, []);

  return (
    <LandingThemeContext.Provider value={{ theme, setTheme, mounted }}>
      {children}
    </LandingThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLandingTheme() {
  const ctx = useContext(LandingThemeContext);
  if (!ctx) throw new Error("useLandingTheme must be used within LandingThemeProvider");
  return ctx;
}
