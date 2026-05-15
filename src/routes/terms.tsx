import { createFileRoute } from "@tanstack/react-router";
import { LegalApp } from "@/components/legal/legal-app";
import { buildLegalHead, getLegalRoute } from "@/components/legal/legal-route-helpers";

export const Route = createFileRoute("/terms")({
  head: ({ match }) => buildLegalHead(getLegalRoute("terms", match.context.lang)),
  component: TermsRoute,
});

function TermsRoute() {
  const { lang } = Route.useRouteContext();
  return <LegalApp initialLang={lang} type="terms" />;
}
