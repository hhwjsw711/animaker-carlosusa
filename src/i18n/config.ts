import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enUS from "@/locales/en-US/translation.json";
import ptBR from "@/locales/pt-BR/translation.json";
import zhCN from "@/locales/zh-CN/translation.json";

const resources = {
  "en-US": { translation: enUS },
  "pt-BR": { translation: ptBR },
  "zh-CN": { translation: zhCN },
};

type Lang = "pt-BR" | "en-US" | "zh-CN";

/**
 * Derives the initial language deterministically from the current URL or
 * cookie — SSR and client hydration must agree, so this runs before React.
 */
function getInitialLang(): Lang {
  if (typeof window === "undefined") return "pt-BR";
  // Only `/en*` and `/zh*` are locale-prefixed paths — pt-BR lives at the root and on
  // unprefixed routes (app, auth). For the latter we read the cookie written
  // by the language switcher (same signal the Worker reads for SSR).
  const path = window.location.pathname;
  if (path === "/en" || path.startsWith("/en/")) return "en-US";
  if (path === "/zh" || path.startsWith("/zh/")) return "zh-CN";
  const match = document.cookie.match(/nivo-lang=([^;]+)/);
  if (match?.[1] === "en-US" || match?.[1] === "zh-CN") return match[1];
  return "pt-BR";
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: getInitialLang(),
    fallbackLng: "pt-BR",
    interpolation: {
      escapeValue: false,
    },
    showSupportNotice: false,
  });

  // Keeps <html lang> in sync with the current render language. Does NOT write
  // the cookie — the cookie represents the user's *explicit* preference and
  // is only written by `persistUserLang` (called from language switchers).
  if (typeof window !== "undefined") {
    i18n.on("languageChanged", (lng) => {
      document.documentElement.lang = lng;
    });
  }
}

/**
 * Called when the user explicitly picks a language (language switcher in the
 * footer, nav-user dropdown). Updates i18n AND writes the preference cookie,
 * which in turn drives the router's URL-rewrite output (locale prefixes).
 */
export async function persistUserLang(lang: Lang): Promise<void> {
  if (i18n.language !== lang) {
    await i18n.changeLanguage(lang);
  }
  if (typeof document !== "undefined") {
    document.cookie = `nivo-lang=${lang};path=/;max-age=31536000;SameSite=Lax`;
  }
}

export default i18n;
