import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import {
  copilotTimesheetEntry,
  copilotTimesheetHoliday,
} from "@workspace/db/schema/copilot-evaluation";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, managerProcedure } from "../../index";

/** Returns true if the given YYYY-MM is strictly before the current month */
function isPastMonth(month: string): boolean {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return month < currentMonth;
}

export const copilotTimesheetRouter = {
  addEmployee: managerProcedure
    .input(
      z.object({
        employee: z.string().min(1),
        month: z.string().regex(/^\d{4}-\d{2}$/),
      })
    )
    .handler(async ({ input }) => {
      if (isPastMonth(input.month)) {
        throw new ORPCError("FORBIDDEN", {
          message: "Cannot modify timesheet for past months",
        });
      }

      // Check if employee already exists for this month
      const [existing] = await db
        .select()
        .from(copilotTimesheetEntry)
        .where(
          and(
            eq(copilotTimesheetEntry.month, input.month),
            eq(copilotTimesheetEntry.employeeName, input.employee)
          )
        )
        .limit(1);

      if (existing) {
        throw new ORPCError("CONFLICT", {
          message: "Employee already exists for this month",
        });
      }

      // Initialize day 1 with empty value to mark presence in this month
      await db.insert(copilotTimesheetEntry).values({
        day: 1,
        employeeName: input.employee,
        id: crypto.randomUUID(),
        month: input.month,
        value: "",
      });

      return { success: true };
    }),

  getMonth: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(async ({ input }) => {
      const entries = await db
        .select()
        .from(copilotTimesheetEntry)
        .where(eq(copilotTimesheetEntry.month, input.month));

      const holidays = await db
        .select()
        .from(copilotTimesheetHoliday)
        .where(eq(copilotTimesheetHoliday.month, input.month));

      // Group by employee
      const employeeMap: Record<string, Record<number, string>> = {};
      for (const entry of entries) {
        if (!employeeMap[entry.employeeName]) {
          employeeMap[entry.employeeName] = {};
        }
        employeeMap[entry.employeeName]![entry.day] = entry.value;
      }

      return {
        employees: Object.entries(employeeMap).map(([name, days]) => ({
          days,
          name,
        })),
        holidays: holidays.map((h) => h.day),
        month: input.month,
      };
    }),

  listEmployees: protectedProcedure.handler(async () => {
    const rows = await db
      .selectDistinct({ employeeName: copilotTimesheetEntry.employeeName })
      .from(copilotTimesheetEntry);
    return rows.map((r) => r.employeeName);
  }),

  setHolidays: managerProcedure
    .input(
      z.object({
        holidays: z.array(z.number().int().min(1).max(31)),
        month: z.string().regex(/^\d{4}-\d{2}$/),
      })
    )
    .handler(async ({ input }) => {
      if (isPastMonth(input.month)) {
        throw new ORPCError("FORBIDDEN", {
          message: "Cannot modify timesheet for past months",
        });
      }

      // Delete existing holidays for this month
      await db
        .delete(copilotTimesheetHoliday)
        .where(eq(copilotTimesheetHoliday.month, input.month));

      // Insert new holidays
      if (input.holidays.length > 0) {
        await db.insert(copilotTimesheetHoliday).values(
          input.holidays.map((day) => ({
            day,
            id: crypto.randomUUID(),
            month: input.month,
          }))
        );
      }

      return { success: true };
    }),

  updateCell: managerProcedure
    .input(
      z.object({
        day: z.number().int().min(1).max(31),
        employee: z.string().min(1),
        month: z.string().regex(/^\d{4}-\d{2}$/),
        value: z.string(),
      })
    )
    .handler(async ({ input }) => {
      if (isPastMonth(input.month)) {
        throw new ORPCError("FORBIDDEN", {
          message: "Cannot modify timesheet for past months",
        });
      }

      const [existing] = await db
        .select()
        .from(copilotTimesheetEntry)
        .where(
          and(
            eq(copilotTimesheetEntry.month, input.month),
            eq(copilotTimesheetEntry.employeeName, input.employee),
            eq(copilotTimesheetEntry.day, input.day)
          )
        );

      await (existing
        ? db
            .update(copilotTimesheetEntry)
            .set({ value: input.value })
            .where(eq(copilotTimesheetEntry.id, existing.id))
        : db.insert(copilotTimesheetEntry).values({
            day: input.day,
            employeeName: input.employee,
            id: crypto.randomUUID(),
            month: input.month,
            value: input.value,
          }));

      return { success: true };
    }),
};
