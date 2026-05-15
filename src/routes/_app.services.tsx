import { createFileRoute } from "@tanstack/react-router";
import { ServicesLayout } from "@/components/services/services-layout";

export const Route = createFileRoute("/_app/services")({
  component: ServicesLayout,
});
