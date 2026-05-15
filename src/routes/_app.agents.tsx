import { createFileRoute } from "@tanstack/react-router";
import { AgentsLayout } from "@/components/agents/agents-layout";

export const Route = createFileRoute("/_app/agents")({
  component: AgentsLayout,
});
