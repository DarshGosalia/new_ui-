import { createFileRoute } from "@tanstack/react-router";

import BusinessProfileSetup from "@/features/instaurl/BusinessProfileSetup";

export const Route = createFileRoute("/insta/profile-setup")({
  component: RouteComponent,
});

function RouteComponent() {
  return <BusinessProfileSetup />;
}
