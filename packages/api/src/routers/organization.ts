import { ORPCError } from "@orpc/server";
import { auth } from "@workspace/auth";
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
import { eq, count, sql, inArray } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, managerProcedure, protectedProcedure } from "../index";

// --- Department ---

const departmentWithStatsSchema = selectDepartmentSchema.extend({
  employeeCount: z.number(),
  managerName: z.string().nullable(),
});

export const departmentRouter = {
  create: adminProcedure
    .input(insertDepartmentSchema)
    .output(selectDepartmentSchema)
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(department)
        .values({ id, ...input })
        .returning();
      if (!created) {
        throw new Error("Failed to create department");
      }
      return created;
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

  list: managerProcedure
    .output(z.array(departmentWithStatsSchema))
    .handler(async () => {
      const rows = await db
        .select({
          createdAt: department.createdAt,
          description: department.description,
          employeeCount: count(employee.id),
          id: department.id,
          managerId: department.managerId,
          managerName: sql<string | null>`(
            SELECT full_name FROM employee WHERE id = ${department.managerId}
          )`,
          name: department.name,
          updatedAt: department.updatedAt,
        })
        .from(department)
        .leftJoin(employee, eq(employee.departmentId, department.id))
        .groupBy(department.id);
      return rows;
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
      if (!updated) {
        throw new Error("Department not found");
      }
      return updated;
    }),
};

// --- Employee ---

const employeeWithDepartmentSchema = selectEmployeeSchema.extend({
  departmentName: z.string(),
  userRole: z.string().nullable(),
});

export const employeeRouter = {
  bulkDelete: adminProcedure
    .input(z.object({ ids: z.array(z.string()).min(1) }))
    .output(z.object({ count: z.number(), success: z.boolean() }))
    .handler(async ({ input }) => {
      const deleted = await db
        .delete(employee)
        .where(inArray(employee.id, input.ids))
        .returning({ id: employee.id });
      return { count: deleted.length, success: true };
    }),

  create: adminProcedure
    .input(insertEmployeeSchema)
    .output(selectEmployeeSchema)
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();

      // Auto-generate employeeCode if not provided
      let { employeeCode } = input;
      if (!employeeCode) {
        const [last] = await db
          .select({ code: employee.employeeCode })
          .from(employee)
          .orderBy(sql`employee_code DESC`)
          .limit(1);
        const nextNum = last
          ? Number.parseInt(last.code.replaceAll(/\D/g, ""), 10) + 1
          : 1;
        employeeCode = `EMP-${String(nextNum).padStart(4, "0")}`;
      }

      // Default joinDate to today if not provided
      const joinDate = input.joinDate ?? new Date().toISOString().split("T")[0];

      // Create user account automatically
      const result = await auth.api.signUpEmail({
        body: {
          email: input.email,
          name: input.fullName,
          password: env.DEFAULT_USER_PASSWORD,
        },
      });

      if (!result?.user?.id) {
        throw new Error("Failed to create user account");
      }

      await db
        .update(user)
        .set({ mustChangePassword: true, role: "EMPLOYEE" })
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
      if (!created) {
        throw new Error("Failed to create employee");
      }
      return created;
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

      if (!emp) {
        throw new Error("Employee not found");
      }
      if (emp.userId) {
        throw new Error("Employee already has an account");
      }

      const result = await auth.api.signUpEmail({
        body: {
          email: emp.email,
          name: emp.fullName,
          password: env.DEFAULT_USER_PASSWORD,
        },
      });

      if (!result?.user?.id) {
        throw new Error("Failed to create user account");
      }

      await db
        .update(user)
        .set({ mustChangePassword: true, role: "EMPLOYEE" })
        .where(eq(user.id, result.user.id));

      await db
        .update(employee)
        .set({ userId: result.user.id })
        .where(eq(employee.id, input.employeeId));

      return { userId: result.user.id };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      await db.delete(employee).where(eq(employee.id, input.id));
      return { success: true };
    }),

  getSelf: protectedProcedure
    .output(
      selectEmployeeSchema.extend({ departmentName: z.string() }).nullable()
    )
    .handler(async ({ context }) => {
      const userId = context.session.user.id;
      const [row] = await db
        .select({
          createdAt: employee.createdAt,
          departmentId: employee.departmentId,
          departmentName: department.name,
          email: employee.email,
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
          id: employee.id,
          joinDate: employee.joinDate,
          phone: employee.phone,
          position: employee.position,
          status: employee.status,
          updatedAt: employee.updatedAt,
          userId: employee.userId,
        })
        .from(employee)
        .innerJoin(department, eq(department.id, employee.departmentId))
        .where(eq(employee.userId, userId))
        .limit(1);
      return row ?? null;
    }),

  list: managerProcedure
    .output(z.array(employeeWithDepartmentSchema))
    .handler(async () => {
      const rows = await db
        .select({
          createdAt: employee.createdAt,
          departmentId: employee.departmentId,
          departmentName: department.name,
          email: employee.email,
          employeeCode: employee.employeeCode,
          fullName: employee.fullName,
          id: employee.id,
          joinDate: employee.joinDate,
          phone: employee.phone,
          position: employee.position,
          status: employee.status,
          updatedAt: employee.updatedAt,
          userId: employee.userId,
          userRole: user.role,
        })
        .from(employee)
        .innerJoin(department, eq(department.id, employee.departmentId))
        .leftJoin(user, eq(user.id, employee.userId));
      return rows;
    }),

  update: adminProcedure
    .input(updateEmployeeSchema.extend({ id: z.string() }))
    .output(selectEmployeeSchema)
    .handler(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(employee)
        .set(data)
        .where(eq(employee.id, id))
        .returning();
      if (!updated) {
        throw new Error("Employee not found");
      }
      return updated;
    }),

  updateSelf: protectedProcedure
    .input(
      z.object({
        fullName: z.string().min(2, "Full name must be at least 2 characters."),
        joinDate: z.string().optional(),
        phone: z.string().nullable().optional(),
        position: z.string().min(1, "Position is required."),
      })
    )
    .output(selectEmployeeSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const [existing] = await db
        .select({ id: employee.id })
        .from(employee)
        .where(eq(employee.userId, userId))
        .limit(1);
      if (!existing) {
        throw new ORPCError("NOT_FOUND", {
          message: "Employee record not found",
        });
      }

      const [updated] = await db
        .update(employee)
        .set(input)
        .where(eq(employee.id, existing.id))
        .returning();
      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Employee not found" });
      }

      // Sync name to user table
      await db
        .update(user)
        .set({ name: input.fullName })
        .where(eq(user.id, userId));

      return updated;
    }),
};
