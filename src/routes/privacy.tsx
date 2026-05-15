import { createFileRoute } from "@tanstack/react-router";
import { LegalApp } from "@/components/legal/legal-app";
import { buildLegalHead, getLegalRoute } from "@/components/legal/legal-route-helpers";

export const Route = createFileRoute("/privacy")({
  head: ({ match }) => buildLegalHead(getLegalRoute("privacy", match.context.lang)),
  component: PrivacyRoute,
});

function PrivacyRoute() {
  const { lang } = Route.useRouteContext();
  return <LegalApp initialLang={lang} type="privacy" />;
}
