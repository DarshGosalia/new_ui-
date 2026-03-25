import { createFileRoute } from "@tanstack/react-router";

import CRMTools from "@/features/customers/pages/CRMTools";

export const Route = createFileRoute("/customers/tools")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CRMTools />;
}
