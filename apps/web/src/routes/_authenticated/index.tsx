import { AskAi } from "@/features/ask-ai";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
  component: AskAi,
});
