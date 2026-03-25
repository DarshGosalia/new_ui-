import { createFileRoute } from "@tanstack/react-router";

import InventoryDashboard from "@/features/instaurl/InventoryDashboard";

export const Route = createFileRoute("/insta/inventory")({
  component: RouteComponent,
});

function RouteComponent() {
  return <InventoryDashboard />;
}
