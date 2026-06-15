import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

import { EvaluationTickets } from "@/features/evaluation";

const evaluationSearchSchema = z.object({
  category: z
    .array(z.union([z.literal("bug"), z.literal("feature")]))
    .optional()
    .catch([]),
  employee: z.array(z.string()).optional().catch([]),
  month: z.string().optional().catch(""),
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  project: z.array(z.string()).optional().catch([]),
  ticket: z.string().optional().catch(""),
});

export const Route = createFileRoute("/_authenticated/evaluation/")({
  component: EvaluationTickets,
  validateSearch: evaluationSearchSchema,
});
