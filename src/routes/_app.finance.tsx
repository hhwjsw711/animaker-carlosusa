import { createFileRoute } from "@tanstack/react-router";
import { FinanceLayout } from "@/components/finance/finance-layout";

export const Route = createFileRoute("/_app/finance")({
  component: FinanceLayout,
});
