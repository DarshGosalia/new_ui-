import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";

import InstaDashboard from "@/features/instaurl/InstaDashboard";

export const Route = createFileRoute("/insta")({
  component: RouteComponent,
});

function RouteComponent() {
  const { pathname } = useLocation();

  if (pathname === "/insta") {
    return <InstaDashboard />;
  }

  return <Outlet />;
}
