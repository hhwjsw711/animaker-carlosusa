import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import appCss from "@/index.css?url";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentLang, type Lang } from "@/i18n/locale-routing";
import i18n from "@/i18n/config";
import "@/i18n/config";

const THEME_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem("theme")||"system";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;document.documentElement.classList.add(r);}catch(e){}})();`;

// esbuild (used by @cloudflare/vite-plugin) references __name in SSR-dehydrated
// inline scripts. Define it globally so the browser can evaluate them.
const ESBUILD_NAME_SHIM = `var __name=(t,n)=>{try{Object.defineProperty(t,"name",{value:n,configurable:!0})}catch(e){}return t}`;

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  // Compute the user's current locale once at the root and propagate to every
  // child route via `context.lang`.
  //
  // `changeLanguage` runs on BOTH server and client so that `t()` used by
  // `useTranslation()` returns strings in the same language the client will
  // hydrate to — otherwise the server renders pt-BR defaults while the client
  // mounts in en-US and React reports a hydration mismatch.
  //
  // Note: on Cloudflare Workers the i18n instance is module-scoped and shared
  // across concurrent requests within the same isolate; mutating it here
  // introduces a theoretical cross-request race when pt-BR and en-US requests
  // interleave during async work. Accepted trade-off for this app's scale.
  beforeLoad: () => {
    // `getCurrentLang()` is isomorphic: server reads `Accept-Language` +
    // `nivo-lang` cookie from the request context; client reads cookie +
    // `navigator.language`. Build-time prerender injects `Accept-Language`
    // per path (see `prerender.headers` in vite.config.ts) so each static
    // HTML file gets the correct locale baked in.
    const lang = getCurrentLang();
    if (i18n.language !== lang) {
      void i18n.changeLanguage(lang);
    }
    return { lang };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Vertex — Assistente inteligente para gestão do seu negócio" },
      {
        name: "description",
        content:
          "Plataforma completa com IA para gerenciar clientes, serviços, produtos, agenda, financeiro e equipe.",
      },
      { property: "og:site_name", content: "Vertex" },
      { name: "theme-color", content: "#0a0a0a" },
      // Suprime a barra de tradução automática do Chrome. A UI já oferece
      // switcher pt/en próprio — a sugestão nativa do navegador atrapalha.
      { name: "google", content: "notranslate" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preload",
        href: "/fonts/InterVariable.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
    ],
    scripts: [{ children: THEME_FLASH_SCRIPT }],
  }),
  notFoundComponent: NotFound,
  component: RootComponent,
});

function RootComponent() {
  const { lang } = Route.useRouteContext();
  usePreloadErrorRecovery();
  return (
    <RootDocument lang={lang}>
      <ThemeProvider>
        <TooltipProvider>
          <Outlet />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </RootDocument>
  );
}

/**
 * After a new deploy, the cached HTML on open tabs still references old
 * chunk hashes. Vite emits `vite:preloadError` when a stale chunk 404s —
 * reload once to fetch fresh HTML + current chunk URLs. A sessionStorage
 * sentinel prevents infinite reload loops if the failure persists.
 */
function usePreloadErrorRecovery() {
  useEffect(() => {
    const RELOAD_SENTINEL = "__preloadErrorReloaded";
    const handler = (event: Event) => {
      if (sessionStorage.getItem(RELOAD_SENTINEL)) {
        console.error("vite:preloadError persisted after reload", event);
        return;
      }
      sessionStorage.setItem(RELOAD_SENTINEL, String(Date.now()));
      window.location.reload();
    };
    window.addEventListener("vite:preloadError", handler);
    const clearSentinel = () => sessionStorage.removeItem(RELOAD_SENTINEL);
    if (document.readyState === "complete") {
      clearSentinel();
    } else {
      window.addEventListener("load", clearSentinel, { once: true });
    }
    return () => {
      window.removeEventListener("vite:preloadError", handler);
      window.removeEventListener("load", clearSentinel);
    };
  }, []);
}

function RootDocument({ children, lang }: { children: ReactNode; lang: Lang }) {
  return (
    <html lang={lang} translate="no" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <script dangerouslySetInnerHTML={{ __html: ESBUILD_NAME_SHIM }} />
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <h1 className="text-3xl font-semibold">{t("errors.notFoundTitle")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("errors.notFoundMessage")}
      </p>
      <a
        href="/"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        {t("actions.backToHome")}
      </a>
    </div>
  );
}
