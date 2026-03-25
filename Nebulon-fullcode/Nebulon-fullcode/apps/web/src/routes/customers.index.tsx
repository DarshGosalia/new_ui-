import { createFileRoute } from "@tanstack/react-router";

import CRMDashboard from "@/features/customers/pages/CRMDashboard";

export const Route = createFileRoute("/customers/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CRMDashboard />;
}
