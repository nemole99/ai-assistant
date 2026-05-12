import { createFileRoute } from "@tanstack/react-router";
import { AskAi } from "@/features/ask-ai";

export const Route = createFileRoute("/_authenticated/ask-ai/$conversationId")({
  component: AskAiRoute,
});

function AskAiRoute() {
  const { conversationId } = Route.useParams();
  return <AskAi conversationId={conversationId} />;
}
