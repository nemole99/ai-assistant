import { db } from "@workspace/db";
import { department, employee, user } from "@workspace/db/schema/auth";
import {
  insertDepartmentSchema,
  updateDepartmentSchema,
  selectDepartmentSchema,
  insertEmployeeSchema,
  updateEmployeeSchema,
  selectEmployeeSchema,
} from "@workspace/db/schema/validation";
import { env } from "@workspace/env/server";
import { auth } from "@workspace/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, managerProcedure } from "../index";

// --- Department ---

export const departmentRouter = {
  list: managerProcedure.output(z.array(selectDepartmentSchema)).handler(async () => {
    return db.select().from(department);
  }),

  create: adminProcedure
    .input(insertDepartmentSchema)
    .output(selectDepartmentSchema)
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(department)
        .values({ id, ...input })
        .returning();
      if (!created) throw new Error("Failed to create department");
      return created;
    }),

  update: adminProcedure
    .input(updateDepartmentSchema.extend({ id: z.string() }))
    .output(selectDepartmentSchema)
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(department)
        .set(data)
        .where(eq(department.id, id))
        .returning();
      if (!updated) throw new Error("Department not found");
      return updated;
    }),
};

// --- Employee ---

export const employeeRouter = {
  list: managerProcedure.output(z.array(selectEmployeeSchema)).handler(async () => {
    return db.select().from(employee);
  }),

  create: adminProcedure
    .input(insertEmployeeSchema)
    .output(selectEmployeeSchema)
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(employee)
        .values({ id, status: "ACTIVE", ...input })
        .returning();
      if (!created) throw new Error("Failed to create employee");
      return created;
    }),

  update: adminProcedure
    .input(updateEmployeeSchema.extend({ id: z.string() }))
    .output(selectEmployeeSchema)
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db.update(employee).set(data).where(eq(employee.id, id)).returning();
      if (!updated) throw new Error("Employee not found");
      return updated;
    }),

  createAccount: adminProcedure
    .input(z.object({ employeeId: z.string() }))
    .output(z.object({ userId: z.string() }))
    .handler(async ({ input }) => {
      const [emp] = await db
        .select()
        .from(employee)
        .where(eq(employee.id, input.employeeId))
        .limit(1);

      if (!emp) throw new Error("Employee not found");
      if (emp.userId) throw new Error("Employee already has an account");

      const result = await auth.api.signUpEmail({
        body: {
          email: emp.email,
          password: env.DEFAULT_USER_PASSWORD,
          name: emp.fullName,
        },
      });

      if (!result?.user?.id) throw new Error("Failed to create user account");

      await db
        .update(user)
        .set({ role: "EMPLOYEE", mustChangePassword: true })
        .where(eq(user.id, result.user.id));

      await db
        .update(employee)
        .set({ userId: result.user.id })
        .where(eq(employee.id, input.employeeId));

      return { userId: result.user.id };
    }),
};
