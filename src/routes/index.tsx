import { createFileRoute } from "@tanstack/react-router";
import { LandingApp } from "@/components/landing/landing-app";
import { buildLandingHead } from "@/components/landing/landing-route-helpers";

export const Route = createFileRoute("/")({
  head: ({ match }) => buildLandingHead(match.context.lang),
  component: LandingRoute,
});

function LandingRoute() {
  const { lang } = Route.useRouteContext();
  return <LandingApp initialLang={lang} />;
}
