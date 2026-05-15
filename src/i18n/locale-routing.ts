import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie, getRequestHeader } from "@tanstack/react-start/server";

export type Lang = "pt-BR" | "en-US" | "zh-CN";

/**
 * URL prefix → language map. Default language (pt-BR) has NO prefix: pt-BR
 * pages live at canonical URLs (`/blog`), en-US pages live under `/en/*`.
 *
 * This is the single source of truth for locale routing. `rewrite.input` uses
 * it to strip prefixes before route matching; `rewrite.output` uses it to add
 * the current-user prefix to every <Link> target.
 */
const PREFIX_TO_LANG: Record<string, Lang> = {
  en: "en-US",
  zh: "zh-CN",
};

const LANG_TO_PREFIX: Record<Lang, string | null> = {
  "en-US": "en",
  "zh-CN": "zh",
  "pt-BR": null,
};

function stripLeadingPrefix(pathname: string): { stripped: string; prefix: string | null } {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && PREFIX_TO_LANG[first]) {
    segments.shift();
    return { stripped: "/" + segments.join("/"), prefix: first };
  }
  return { stripped: pathname, prefix: null };
}

/**
 * Strips a known locale prefix from the URL path. The router matches against
 * the stripped (canonical) form — so `/en/blog` and `/blog` share one route
 * definition.
 */
export function deLocalizeUrl(url: URL): URL {
  const { stripped, prefix } = stripLeadingPrefix(url.pathname);
  if (!prefix) return url;
  url.pathname = stripped || "/";
  return url;
}

/**
 * Adds the current user's locale prefix to a canonical URL. No-op for the
 * default language (pt-BR).
 */
export function localizeUrl(url: URL, lang: Lang): URL {
  const prefix = LANG_TO_PREFIX[lang];
  if (!prefix) return url;
  // Avoid double-prefix if the URL already contains a locale segment.
  if (stripLeadingPrefix(url.pathname).prefix) return url;
  const suffix = url.pathname === "/" ? "" : url.pathname;
  url.pathname = `/${prefix}${suffix}`;
  return url;
}

/**
 * Reads the current user's locale preference. Isomorphic — on SSR it reads the
 * request cookie / Accept-Language; on the client it reads the cookie (set by
 * the language switcher via `persistUserLang`) / navigator.language.
 *
 * The cookie is the authoritative signal once the user has made an explicit
 * choice. Otherwise we fall back to browser preference. The default is pt-BR
 * because this is a Brazilian-primary product.
 */
export const getCurrentLang = createIsomorphicFn()
  .client((): Lang => {
    if (typeof document === "undefined") return "pt-BR";
    const match = document.cookie.match(/nivo-lang=([^;]+)/);
    if (match?.[1] === "en-US" || match?.[1] === "pt-BR" || match?.[1] === "zh-CN") return match[1];
    if (typeof navigator !== "undefined") {
      const navLang = navigator.language ?? "";
      if (/^zh/i.test(navLang)) return "zh-CN";
      if (/^en/i.test(navLang)) return "en-US";
    }
    return "pt-BR";
  })
  .server((): Lang => {
    const cookie = getCookie("nivo-lang");
    if (cookie === "en-US" || cookie === "pt-BR" || cookie === "zh-CN") return cookie;
    const accept = getRequestHeader("accept-language") ?? "";
    const trimmed = accept.trim();
    if (/^zh(-|_|,|;|$)/i.test(trimmed)) return "zh-CN";
    if (/^en(-|_|,|;|$)/i.test(trimmed)) return "en-US";
    return "pt-BR";
  });

/**
 * Returns the locale prefix path segment for a given language (e.g. `/en`) or
 * empty string for the default. Useful when building canonical URLs for SEO.
 */
export function langPrefix(lang: Lang): string {
  const prefix = LANG_TO_PREFIX[lang];
  return prefix ? `/${prefix}` : "";
}
