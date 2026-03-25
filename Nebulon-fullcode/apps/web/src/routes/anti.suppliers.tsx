import { createFileRoute } from "@tanstack/react-router";

import SupplierList from "@/features/feature1-anti/pages/SupplierList";

export const Route = createFileRoute("/anti/suppliers")({
  component: RouteComponent,
});

function RouteComponent() {
  return <SupplierList />;
}
