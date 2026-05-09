import { db } from "@workspace/db";
import { department, employee, user } from "@workspace/db/schema/auth";
import { env } from "@workspace/env/server";
import { auth } from "@workspace/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, managerProcedure } from "../index";

// --- Department ---

export const departmentRouter = {
  list: managerProcedure.handler(async () => {
    return db.select().from(department);
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(department)
        .values({ id, name: input.name, description: input.description ?? null })
        .returning();
      return created;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        managerId: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(department)
        .set(data)
        .where(eq(department.id, id))
        .returning();
      return updated;
    }),
};

// --- Employee ---

export const employeeRouter = {
  list: managerProcedure.handler(async () => {
    return db.select().from(employee);
  }),

  create: adminProcedure
    .input(
      z.object({
        employeeCode: z.string().min(1),
        fullName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        position: z.string().min(1),
        departmentId: z.string(),
        joinDate: z.string(), // ISO date string YYYY-MM-DD
      }),
    )
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(employee)
        .values({
          id,
          employeeCode: input.employeeCode,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone ?? null,
          position: input.position,
          departmentId: input.departmentId,
          joinDate: input.joinDate,
          status: "ACTIVE",
        })
        .returning();
      return created;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        fullName: z.string().min(1).optional(),
        phone: z.string().nullable().optional(),
        position: z.string().min(1).optional(),
        departmentId: z.string().optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      }),
    )
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(employee)
        .set(data)
        .where(eq(employee.id, id))
        .returning();
      return updated;
    }),

  // Create a User account for an existing Employee
  createAccount: adminProcedure
    .input(z.object({ employeeId: z.string() }))
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

      // Set role to EMPLOYEE and mustChangePassword
      await db
        .update(user)
        .set({ role: "EMPLOYEE", mustChangePassword: true })
        .where(eq(user.id, result.user.id));

      // Link employee to user
      await db
        .update(employee)
        .set({ userId: result.user.id })
        .where(eq(employee.id, input.employeeId));

      return { userId: result.user.id };
    }),
};
