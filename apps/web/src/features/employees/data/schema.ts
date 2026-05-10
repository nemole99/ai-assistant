import { z } from "zod";

const employeeStatusSchema = z.union([
  z.literal("ACTIVE"),
  z.literal("INACTIVE"),
]);
export type EmployeeStatus = z.infer<typeof employeeStatusSchema>;

const employeeSchema = z.object({
  id: z.string(),
  employeeCode: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  position: z.string(),
  departmentId: z.string(),
  departmentName: z.string(),
  userId: z.string().nullable(),
  joinDate: z.string(),
  status: employeeStatusSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Employee = z.infer<typeof employeeSchema>;
