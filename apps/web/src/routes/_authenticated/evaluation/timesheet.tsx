import { createFileRoute } from "@tanstack/react-router";

import { EvaluationTimesheet } from "@/features/evaluation/components/timesheet-page";

export const Route = createFileRoute("/_authenticated/evaluation/timesheet")({
  component: EvaluationTimesheet,
});
