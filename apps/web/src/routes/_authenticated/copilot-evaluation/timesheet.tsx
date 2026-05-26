import { createFileRoute } from "@tanstack/react-router";
import { CopilotEvaluationTimesheet } from "@/features/copilot-evaluation/components/timesheet-page";

export const Route = createFileRoute("/_authenticated/copilot-evaluation/timesheet")({
  component: CopilotEvaluationTimesheet,
});
