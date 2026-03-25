import { createFileRoute } from "@tanstack/react-router";

import PaymentHistory from "@/features/feature1-anti/pages/PaymentHistory";

export const Route = createFileRoute("/anti/payments")({
  component: RouteComponent,
});

function RouteComponent() {
  return <PaymentHistory />;
}
