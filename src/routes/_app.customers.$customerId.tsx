import { createFileRoute } from "@tanstack/react-router";
import { CustomersLayout } from "@/components/customers/customers-layout";

export const Route = createFileRoute("/_app/customers/$customerId")({
  component: CustomersLayout,
});
