import { createFileRoute } from "@tanstack/react-router";

import AIGenerator from "@/components/AIGenerator";

export const Route = createFileRoute("/builder")({
  component: BuilderPage,
});

function BuilderPage() {
  return (
    <div className="ai-generator-wrapper">
      <AIGenerator />
    </div>
  );
}
