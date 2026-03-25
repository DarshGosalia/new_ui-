import { createFileRoute } from "@tanstack/react-router";

import CRMReports from "@/features/customers/pages/CRMReports";

export const Route = createFileRoute("/customers/reports")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CRMReports />;
}
