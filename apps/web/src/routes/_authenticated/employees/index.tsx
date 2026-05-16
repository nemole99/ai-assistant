import { createFileRoute } from "@tanstack/react-router";
import z from "zod";

import { Employees } from "@/features/employees";

const employeesSearchSchema = z.object({
  department: z.array(z.string()).optional().catch([]),
  name: z.string().optional().catch(""),
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z
    .array(z.union([z.literal("ACTIVE"), z.literal("INACTIVE")]))
    .optional()
    .catch([]),
});

export const Route = createFileRoute("/_authenticated/employees/")({
  component: Employees,
  validateSearch: employeesSearchSchema,
});
