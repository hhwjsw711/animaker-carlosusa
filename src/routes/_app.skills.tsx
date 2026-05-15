import { createFileRoute } from "@tanstack/react-router";
import { SkillsLayout } from "@/components/skills/skills-layout";

export const Route = createFileRoute("/_app/skills")({
  component: SkillsLayout,
});
