import { createFileRoute } from "@tanstack/react-router";

import Comparison from "@/features/feature1-anti/pages/Comparison";

export const Route = createFileRoute("/anti/comparison")({
  component: RouteComponent,
});

function RouteComponent() {
  return <Comparison />;
}
