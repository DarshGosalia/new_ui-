import { createFileRoute } from "@tanstack/react-router";

import PaymentCalendar from "@/features/feature1-anti/pages/PaymentCalendar";

export const Route = createFileRoute("/anti/calendar")({
  component: RouteComponent,
});

function RouteComponent() {
  return <PaymentCalendar />;
}
