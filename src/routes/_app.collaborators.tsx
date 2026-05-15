import { createFileRoute } from "@tanstack/react-router";
import { CollaboratorsLayout } from "@/components/collaborators/collaborators-layout";

export const Route = createFileRoute("/_app/collaborators")({
  component: CollaboratorsLayout,
});
