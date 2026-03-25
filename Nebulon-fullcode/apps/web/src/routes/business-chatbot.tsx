import { createFileRoute } from "@tanstack/react-router";

import BusinessChatbotPage from "@/features/business-chatbot/BusinessChatbotPage";

export const Route = createFileRoute("/business-chatbot")({
  component: RouteComponent,
});

function RouteComponent() {
  return <BusinessChatbotPage />;
}
