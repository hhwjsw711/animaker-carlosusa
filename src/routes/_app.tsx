import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useTranslation } from "react-i18next";
import Spinner from "@/components/ui/custom/spinner";
import { ErrorBoundary } from "@/components/error-boundary";
import { NavDesktop } from "@/components/layout/nav-desktop";
import { NavMobile } from "@/components/layout/nav-mobile";
import { DynamicContentWrapper } from "@/components/layout/dynamic-content-wrapper";
import { TopBarActionsProvider } from "@/components/layout/top-bar-actions-context";
import { InsufficientCreditsDialog } from "@/components/usage/insufficient-credits-dialog";
import { OnboardingGuard } from "@/components/onboarding/onboarding-guard";
import useNavigationStore from "@/stores/navigation";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const syncFromPathname = useNavigationStore((s) => s.syncFromPathname);

  // Keep the navigation store's `activePage` in sync with the URL. Existing
  // layouts read `activePage` to gate subscriptions (`isActive`); with file-
  // based routing the URL is the source of truth.
  useEffect(() => {
    syncFromPathname(pathname);
  }, [pathname, syncFromPathname]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: "/signin", replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="text-muted-foreground" />
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={(_error, reset) => (
        <div className="flex h-dvh items-center justify-center">
          <button
            onClick={() => {
              reset();
              window.location.reload();
            }}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            {t("actions.reload")}
          </button>
        </div>
      )}
    >
      <OnboardingGuard>
        <InsufficientCreditsDialog />
        <div className="flex w-full h-dvh md:h-screen flex-col md:flex-row overflow-hidden">
          <NavDesktop />
          <TopBarActionsProvider>
            <NavMobile />
            <DynamicContentWrapper>
              <Outlet />
            </DynamicContentWrapper>
          </TopBarActionsProvider>
        </div>
      </OnboardingGuard>
    </ErrorBoundary>
  );
}
