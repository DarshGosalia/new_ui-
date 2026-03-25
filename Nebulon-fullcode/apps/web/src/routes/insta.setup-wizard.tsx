import { createFileRoute } from "@tanstack/react-router";

import BusinessSetupWizard from "@/features/instaurl/BusinessSetupWizard";

export const Route = createFileRoute("/insta/setup-wizard")({
  component: RouteComponent,
});

function RouteComponent() {
  return <BusinessSetupWizard />;
}
