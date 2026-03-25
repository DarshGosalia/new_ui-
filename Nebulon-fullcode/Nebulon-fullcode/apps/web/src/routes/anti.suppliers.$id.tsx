import { createFileRoute } from "@tanstack/react-router";

import SupplierProfile from "@/features/feature1-anti/pages/SupplierProfile";

export const Route = createFileRoute("/anti/suppliers/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  return <SupplierProfile />;
}
