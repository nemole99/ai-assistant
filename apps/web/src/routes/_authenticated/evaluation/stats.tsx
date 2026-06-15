import { createFileRoute } from "@tanstack/react-router";

import { EvaluationStats } from "@/features/evaluation/components/stats-page";

export const Route = createFileRoute("/_authenticated/evaluation/stats")({
  component: EvaluationStats,
});
