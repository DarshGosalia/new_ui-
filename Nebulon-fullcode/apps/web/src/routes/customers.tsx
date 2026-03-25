import { createFileRoute } from "@tanstack/react-router";

import CRMLayout from "@/features/customers/components/CRMLayout";

export const Route = createFileRoute("/customers")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CRMLayout />;
}
