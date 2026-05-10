import z from "zod";
import { createFileRoute } from "@tanstack/react-router";
import { Employees } from "@/features/employees";

const employeesSearchSchema = z.object({
  page: z.number().optional().catch(1),
  pageSize: z.number().optional().catch(10),
  status: z
    .array(z.union([z.literal("ACTIVE"), z.literal("INACTIVE")]))
    .optional()
    .catch([]),
  department: z.array(z.string()).optional().catch([]),
  name: z.string().optional().catch(""),
});

export const Route = createFileRoute("/_authenticated/employees/")({
  validateSearch: employeesSearchSchema,
  component: Employees,
});
