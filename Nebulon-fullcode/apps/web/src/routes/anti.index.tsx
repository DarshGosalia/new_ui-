import { createFileRoute } from "@tanstack/react-router";

import Dashboard from "@/features/feature1-anti/pages/Dashboard";

export const Route = createFileRoute("/anti/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Dashboard />;
}
