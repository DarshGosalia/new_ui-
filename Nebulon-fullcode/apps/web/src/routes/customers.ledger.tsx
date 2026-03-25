import { createFileRoute } from "@tanstack/react-router";

import CRMLedger from "@/features/customers/pages/CRMLedger";

export const Route = createFileRoute("/customers/ledger")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CRMLedger />;
}
