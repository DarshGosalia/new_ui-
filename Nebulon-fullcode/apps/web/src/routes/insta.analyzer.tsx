import { createFileRoute } from "@tanstack/react-router";

import InstagramAnalyzer from "@/features/instaurl/InstagramAnalyzer";

export const Route = createFileRoute("/insta/analyzer")({
  component: RouteComponent,
});

function RouteComponent() {
  return <InstagramAnalyzer />;
}
