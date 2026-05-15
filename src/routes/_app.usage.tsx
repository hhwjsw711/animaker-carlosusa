import { createFileRoute } from "@tanstack/react-router";
import { UsageLayout } from "@/components/usage/usage-layout";

export const Route = createFileRoute("/_app/usage")({
  component: UsageLayout,
  validateSearch: (search: Record<string, unknown>) => ({
    checkout:
      search.checkout === "success" || search.checkout === "canceled"
        ? (search.checkout as "success" | "canceled")
        : undefined,
    pack: typeof search.pack === "string" ? search.pack : undefined,
  }),
});
