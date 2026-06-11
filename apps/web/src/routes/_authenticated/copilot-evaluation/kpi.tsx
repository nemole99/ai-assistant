import { createFileRoute } from "@tanstack/react-router";

import { CopilotEvaluationKpi } from "@/features/copilot-evaluation/components/kpi-page";

export const Route = createFileRoute("/_authenticated/copilot-evaluation/kpi")({
  component: CopilotEvaluationKpi,
});
