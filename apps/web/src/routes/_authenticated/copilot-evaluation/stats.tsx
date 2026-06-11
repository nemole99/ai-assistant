import { createFileRoute } from "@tanstack/react-router";

import { CopilotEvaluationStats } from "@/features/copilot-evaluation/components/stats-page";

export const Route = createFileRoute(
  "/_authenticated/copilot-evaluation/stats"
)({
  component: CopilotEvaluationStats,
});
