import { createRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { routeTree } from "./routeTree.gen";
import {
  deLocalizeUrl,
  getCurrentLang,
  localizeUrl,
} from "./i18n/locale-routing";

// Shared browser-only reference to the active router instance. Non-React code
// paths (toast actions, Convex error handlers) need to navigate without going
// through `window.location.assign`, which would force a full reload and lose
// the warm SPA state. React code should still prefer `useNavigate()` / `<Link>`.
let activeRouter: ReturnType<typeof routerWithQueryClient> | null = null;
export function getActiveRouter() {
  return activeRouter;
}

export function getRouter() {
  const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!CONVEX_URL) {
    throw new Error("VITE_CONVEX_URL is required");
  }
  const convexQueryClient = new ConvexQueryClient(CONVEX_URL);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        // Keep cached data around for 10 min after last observer. Real-time
        // Convex subscriptions in the authenticated app are invalidated by
        // the server; per-query `staleTime` controls freshness for the
        // public pages' one-shot fetches.
        gcTime: 10 * 60 * 1000,
      },
    },
  });
  convexQueryClient.connect(queryClient);

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: "intent",
      context: { queryClient },
      scrollRestoration: true,
      // Allow intent-preloaded loader data to satisfy a click within 60s —
      // avoids re-running loaders for the common "hover then click" path.
      defaultPreloadStaleTime: 60_000,
      // If a loader takes longer than 150ms, show the route's pending component
      // (or a blank frame) so users see something happening instead of the
      // previous page hanging silently.
      defaultPendingMs: 150,
      defaultPendingMinMs: 200,
      // Bidirectional URL rewrite for locale prefixes. Browser URL `/en/foo`
      // matches the `/foo` route internally (input); `<Link to="/foo">`
      // emits `/en/foo` for en-US users (output). The route tree stays
      // un-duplicated: one file per page, locale is orthogonal.
      rewrite: {
        input: ({ url }) => deLocalizeUrl(url),
        output: ({ url }) => localizeUrl(url, getCurrentLang()),
      },
      Wrap: ({ children }) => {
        // ConvexAuthProvider uses Convex hooks internally and is not SSR-safe.
        // Only wrap in the browser; server-rendered public pages don't need auth.
        if (typeof window === "undefined") return <>{children}</>;
        return (
          <ConvexAuthProvider client={convexQueryClient.convexClient}>
            {children}
          </ConvexAuthProvider>
        );
      },
    }),
    queryClient,
  );

  if (typeof window !== "undefined") activeRouter = router;
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
