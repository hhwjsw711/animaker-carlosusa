import { createFileRoute } from "@tanstack/react-router";
import { ProductsLayout } from "@/components/products/products-layout";

export const Route = createFileRoute("/_app/products")({
  component: ProductsLayout,
});
