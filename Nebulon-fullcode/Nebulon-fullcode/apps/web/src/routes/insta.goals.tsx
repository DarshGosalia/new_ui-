import { createFileRoute } from "@tanstack/react-router";

import GoalThresholdConfig from "@/features/instaurl/GoalThresholdConfig";

export const Route = createFileRoute("/insta/goals")({
  component: RouteComponent,
});

function RouteComponent() {
  return <GoalThresholdConfig />;
}
