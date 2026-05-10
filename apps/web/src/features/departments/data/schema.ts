import { z } from "zod";

const departmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  managerId: z.string().nullable(),
  managerName: z.string().nullable(),
  employeeCount: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Department = z.infer<typeof departmentSchema>;
