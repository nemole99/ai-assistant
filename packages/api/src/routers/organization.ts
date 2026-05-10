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
import { eq, count, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { ORPCError } from "@orpc/server";

import { adminProcedure, managerProcedure, protectedProcedure } from "../index";

// --- Department ---

const departmentWithStatsSchema = selectDepartmentSchema.extend({
  employeeCount: z.number(),
  managerName: z.string().nullable(),
});

export const departmentRouter = {
  list: managerProcedure.output(z.array(departmentWithStatsSchema)).handler(async () => {
    const rows = await db
      .select({
        id: department.id,
        name: department.name,
        description: department.description,
        managerId: department.managerId,
        createdAt: department.createdAt,
        updatedAt: department.updatedAt,
        employeeCount: count(employee.id),
        managerName: sql<string | null>`(
            SELECT full_name FROM employee WHERE id = ${department.managerId}
          )`,
      })
      .from(department)
      .leftJoin(employee, eq(employee.departmentId, department.id))
      .groupBy(department.id);
    return rows;
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

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      const [row] = await db
        .select({ employeeCount: count(employee.id) })
        .from(employee)
        .where(eq(employee.departmentId, input.id));

      if (row && row.employeeCount > 0) {
        throw new Error("Cannot delete department with existing employees");
      }

      await db.delete(department).where(eq(department.id, input.id));
      return { success: true };
    }),
};

// --- Employee ---

const employeeWithDepartmentSchema = selectEmployeeSchema.extend({
  departmentName: z.string(),
  userRole: z.string().nullable(),
});

export const employeeRouter = {
  list: managerProcedure.output(z.array(employeeWithDepartmentSchema)).handler(async () => {
    const rows = await db
      .select({
        id: employee.id,
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
        email: employee.email,
        phone: employee.phone,
        position: employee.position,
        departmentId: employee.departmentId,
        departmentName: department.name,
        userId: employee.userId,
        userRole: user.role,
        joinDate: employee.joinDate,
        status: employee.status,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
      })
      .from(employee)
      .innerJoin(department, eq(department.id, employee.departmentId))
      .leftJoin(user, eq(user.id, employee.userId));
    return rows;
  }),

  create: adminProcedure
    .input(insertEmployeeSchema)
    .output(selectEmployeeSchema)
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();

      // Auto-generate employeeCode if not provided
      let employeeCode = input.employeeCode;
      if (!employeeCode) {
        const [last] = await db
          .select({ code: employee.employeeCode })
          .from(employee)
          .orderBy(sql`employee_code DESC`)
          .limit(1);
        const nextNum = last ? parseInt(last.code.replace(/\D/g, ""), 10) + 1 : 1;
        employeeCode = `EMP-${String(nextNum).padStart(4, "0")}`;
      }

      // Default joinDate to today if not provided
      const joinDate = input.joinDate ?? new Date().toISOString().split("T")[0];

      // Create user account automatically
      const result = await auth.api.signUpEmail({
        body: {
          email: input.email,
          password: env.DEFAULT_USER_PASSWORD,
          name: input.fullName,
        },
      });

      if (!result?.user?.id) throw new Error("Failed to create user account");

      await db
        .update(user)
        .set({ role: "EMPLOYEE", mustChangePassword: true })
        .where(eq(user.id, result.user.id));

      const [created] = await db
        .insert(employee)
        .values({
          id,
          status: "ACTIVE",
          ...input,
          employeeCode: employeeCode!,
          joinDate: joinDate!,
          userId: result.user.id,
        })
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

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      await db.delete(employee).where(eq(employee.id, input.id));
      return { success: true };
    }),

  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .output(z.object({ success: z.boolean(), count: z.number() }))
    .handler(async ({ input }) => {
      const deleted = await db
        .delete(employee)
        .where(inArray(employee.id, input.ids))
        .returning({ id: employee.id });
      return { success: true, count: deleted.length };
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

  getSelf: protectedProcedure
    .output(selectEmployeeSchema.extend({ departmentName: z.string() }).nullable())
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const [row] = await db
        .select({
          id: employee.id,
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
          email: employee.email,
          phone: employee.phone,
          position: employee.position,
          departmentId: employee.departmentId,
          departmentName: department.name,
          userId: employee.userId,
          joinDate: employee.joinDate,
          status: employee.status,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
        })
        .from(employee)
        .innerJoin(department, eq(department.id, employee.departmentId))
        .where(eq(employee.userId, userId))
        .limit(1);
      return row ?? null;
    }),

  updateSelf: protectedProcedure
    .input(
      z.object({
        fullName: z.string().min(2, "Full name must be at least 2 characters."),
        position: z.string().min(1, "Position is required."),
        phone: z.string().nullable().optional(),
        joinDate: z.string().optional(),
      }),
    )
    .output(selectEmployeeSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const [existing] = await db
        .select({ id: employee.id })
        .from(employee)
        .where(eq(employee.userId, userId))
        .limit(1);
      if (!existing)
        throw new ORPCError("NOT_FOUND", {
          message: "Employee record not found",
        });

      const [updated] = await db
        .update(employee)
        .set(input)
        .where(eq(employee.id, existing.id))
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND", { message: "Employee not found" });

      // Sync name to user table
      await db.update(user).set({ name: input.fullName }).where(eq(user.id, userId));

      return updated;
    }),
};
