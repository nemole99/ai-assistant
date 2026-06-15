import { createFileRoute } from "@tanstack/react-router";

import { EvaluationKpi } from "@/features/evaluation/components/kpi-page";

export const Route = createFileRoute("/_authenticated/evaluation/kpi")({
  component: EvaluationKpi,
});
