import { createFileRoute } from "@tanstack/react-router";

import CRMCustomers from "@/features/customers/pages/CRMCustomers";

export const Route = createFileRoute("/customers/customers")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CRMCustomers />;
}
