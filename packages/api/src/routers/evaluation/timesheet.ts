import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { employee } from "@workspace/db/schema/auth";
import {
  evaluationTimesheetEntry,
  evaluationTimesheetHoliday,
} from "@workspace/db/schema/evaluation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { managerProcedure, protectedProcedure } from "../../index";
import {
  assertEmployeeActive,
  resolvePerformedBy,
  writeAudit,
} from "./helpers";

function isPastMonth(month: string): boolean {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return month < currentMonth;
}

export const evaluationTimesheetRouter = {
  addEmployee: managerProcedure
    .input(
      z.object({
        employeeId: z.string().min(1),
        month: z.string().regex(/^\d{4}-\d{2}$/),
      })
    )
    .handler(async ({ context, input }) => {
      if (isPastMonth(input.month)) {
        throw new ORPCError("FORBIDDEN", {
          message: "Cannot modify timesheet for past months",
        });
      }

      await assertEmployeeActive(input.employeeId);

      const [existing] = await db
        .select()
        .from(evaluationTimesheetEntry)
        .where(
          and(
            eq(evaluationTimesheetEntry.month, input.month),
            eq(evaluationTimesheetEntry.employeeId, input.employeeId)
          )
        )
        .limit(1);

      if (existing) {
        throw new ORPCError("CONFLICT", {
          message: "Employee already in timesheet for this month",
        });
      }

      await db.insert(evaluationTimesheetEntry).values({
        day: 1,
        employeeId: input.employeeId,
        id: crypto.randomUUID(),
        month: input.month,
        value: "",
      });

      const performedBy = await resolvePerformedBy(context.session.user.id);
      await writeAudit({
        action: "UPDATE_TIMESHEET",
        details: {
          employeeId: input.employeeId,
          event: "addEmployee",
          month: input.month,
        },
        employeeId: input.employeeId,
        performedBy,
      });

      return { success: true };
    }),

  getMonth: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(async ({ input }) => {
      const entries = await db
        .select({
          day: evaluationTimesheetEntry.day,
          employeeId: evaluationTimesheetEntry.employeeId,
          fullName: employee.fullName,
          value: evaluationTimesheetEntry.value,
        })
        .from(evaluationTimesheetEntry)
        .innerJoin(
          employee,
          eq(evaluationTimesheetEntry.employeeId, employee.id)
        )
        .where(eq(evaluationTimesheetEntry.month, input.month));

      const holidays = await db
        .select()
        .from(evaluationTimesheetHoliday)
        .where(eq(evaluationTimesheetHoliday.month, input.month));

      const employeeMap: Record<
        string,
        { fullName: string; days: Record<number, string> }
      > = {};
      for (const entry of entries) {
        if (!employeeMap[entry.employeeId]) {
          employeeMap[entry.employeeId] = {
            days: {},
            fullName: entry.fullName,
          };
        }
        employeeMap[entry.employeeId]!.days[entry.day] = entry.value;
      }

      return {
        employees: Object.entries(employeeMap).map(([employeeId, data]) => ({
          days: data.days,
          employeeId,
          fullName: data.fullName,
        })),
        holidays: holidays.map((h) => h.day),
        month: input.month,
      };
    }),

  latestMonth: protectedProcedure.handler(async () => {
    const [row] = await db
      .select({
        latest: sql<string | null>`max(${evaluationTimesheetEntry.month})`,
      })
      .from(evaluationTimesheetEntry);
    return { month: row?.latest ?? null };
  }),

  listEmployees: protectedProcedure.handler(async () => {
    const rows = await db
      .select({ fullName: employee.fullName, id: employee.id })
      .from(employee)
      .where(eq(employee.status, "ACTIVE"))
      .orderBy(employee.fullName);
    return rows;
  }),

  setHolidays: managerProcedure
    .input(
      z.object({
        holidays: z.array(z.number().int().min(1).max(31)),
        month: z.string().regex(/^\d{4}-\d{2}$/),
      })
    )
    .handler(async ({ context, input }) => {
      if (isPastMonth(input.month)) {
        throw new ORPCError("FORBIDDEN", {
          message: "Cannot modify timesheet for past months",
        });
      }

      await db
        .delete(evaluationTimesheetHoliday)
        .where(eq(evaluationTimesheetHoliday.month, input.month));

      if (input.holidays.length > 0) {
        await db.insert(evaluationTimesheetHoliday).values(
          input.holidays.map((day) => ({
            day,
            id: crypto.randomUUID(),
            month: input.month,
          }))
        );
      }

      const performedBy = await resolvePerformedBy(context.session.user.id);
      await writeAudit({
        action: "SET_HOLIDAYS",
        details: { days: input.holidays, month: input.month },
        performedBy,
      });

      return { success: true };
    }),

  updateCell: managerProcedure
    .input(
      z.object({
        day: z.number().int().min(1).max(31),
        employeeId: z.string().min(1),
        month: z.string().regex(/^\d{4}-\d{2}$/),
        value: z.string(),
      })
    )
    .handler(async ({ context, input }) => {
      if (isPastMonth(input.month)) {
        throw new ORPCError("FORBIDDEN", {
          message: "Cannot modify timesheet for past months",
        });
      }

      const [existing] = await db
        .select()
        .from(evaluationTimesheetEntry)
        .where(
          and(
            eq(evaluationTimesheetEntry.month, input.month),
            eq(evaluationTimesheetEntry.employeeId, input.employeeId),
            eq(evaluationTimesheetEntry.day, input.day)
          )
        );

      await (existing
        ? db
            .update(evaluationTimesheetEntry)
            .set({ value: input.value })
            .where(eq(evaluationTimesheetEntry.id, existing.id))
        : db.insert(evaluationTimesheetEntry).values({
            day: input.day,
            employeeId: input.employeeId,
            id: crypto.randomUUID(),
            month: input.month,
            value: input.value,
          }));

      const performedBy = await resolvePerformedBy(context.session.user.id);
      await writeAudit({
        action: "UPDATE_TIMESHEET",
        details: {
          day: input.day,
          employeeId: input.employeeId,
          month: input.month,
          value: input.value,
        },
        employeeId: input.employeeId,
        performedBy,
      });

      return { success: true };
    }),
};
