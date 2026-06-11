import { createFileRoute } from "@tanstack/react-router";

import { CopilotEvaluationTickets } from "@/features/copilot-evaluation";

export const Route = createFileRoute("/_authenticated/copilot-evaluation/")({
  component: CopilotEvaluationTickets,
});
