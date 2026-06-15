import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { employee, project } from "@workspace/db/schema/auth";
import {
  evaluationKpiProductivity,
  evaluationKpiQuality,
  evaluationKpiSharing,
  evaluationKpiSummary,
  evaluationTicket,
  evaluationTimesheetEntry,
} from "@workspace/db/schema/evaluation";
import { and, count, eq, getTableColumns, sql } from "drizzle-orm";
import { z } from "zod";

import { managerProcedure, protectedProcedure } from "../../index";
import { resolvePerformedBy, writeAudit } from "./helpers";

/** Returns true if YYYY-MM is strictly before the current month */
function isPastMonth(month: string): boolean {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return month < currentMonth;
}

function assertNotPastMonth(month: string) {
  if (isPastMonth(month)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Cannot modify KPI data for past months",
    });
  }
}

const monthValueInput = z.object({
  id: z.string(),
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
  value: z.number(),
});

/**
 * Derives the quality KPI display numbers (legacy web parity):
 * - totalByMar: stored baseline, else Jan+Feb+Mar re-open counts of the year
 * - result: sum of the year's monthly re-open counts
 * - reopenNumber: (totalByMar + result) × reopenPercent, rounded to 1 decimal
 */
interface ProductivityAggregationMaps {
  ticketMap: Map<string, number>;
  workMap: Map<string, number>;
}

async function loadProductivityAggregationMaps(
  year: number
): Promise<ProductivityAggregationMaps> {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year + 1}-01-01`;

  const ticketCounts = await db
    .select({
      employeeId: evaluationTicket.employeeId,
      month: sql<string>`TO_CHAR(${evaluationTicket.processDate}::date, 'YYYY-MM')`,
      ticketCount: count(),
    })
    .from(evaluationTicket)
    .where(
      and(
        sql`${evaluationTicket.processDate}::date >= ${yearStart}::date`,
        sql`${evaluationTicket.processDate}::date < ${yearEnd}::date`
      )
    )
    .groupBy(
      evaluationTicket.employeeId,
      sql`TO_CHAR(${evaluationTicket.processDate}::date, 'YYYY-MM')`
    );

  const workDayRows = await db
    .select({
      employeeId: evaluationTimesheetEntry.employeeId,
      month: evaluationTimesheetEntry.month,
      workDays: sql<number>`SUM(CASE WHEN ${evaluationTimesheetEntry.value} = 'x' THEN 1 WHEN ${evaluationTimesheetEntry.value} = 'x/2' THEN 0.5 ELSE 0 END)`,
    })
    .from(evaluationTimesheetEntry)
    .where(
      sql`SPLIT_PART(${evaluationTimesheetEntry.month}, '-', 1)::int = ${year}`
    )
    .groupBy(
      evaluationTimesheetEntry.employeeId,
      evaluationTimesheetEntry.month
    );

  return {
    ticketMap: new Map(
      ticketCounts.map((r) => [
        `${r.employeeId}:${r.month}`,
        Number(r.ticketCount),
      ])
    ),
    workMap: new Map(
      workDayRows.map((r) => [`${r.employeeId}:${r.month}`, Number(r.workDays)])
    ),
  };
}

/**
 * Merges stored monthly productivity with tickets/workdays for the year.
 * Computed ticket/day wins when both ticket count and work days are present.
 */
function deriveProductivityMonthlyValues(
  employeeId: string,
  storedMonthly: Record<string, number> | null,
  year: number,
  maps: ProductivityAggregationMaps
): Record<string, number> {
  const monthlyValues: Record<string, number> = { ...storedMonthly };
  for (let m = 1; m <= 12; m++) {
    const ym = `${year}-${String(m).padStart(2, "0")}`;
    const tickets = maps.ticketMap.get(`${employeeId}:${ym}`) ?? 0;
    const work = maps.workMap.get(`${employeeId}:${ym}`) ?? 0;
    if (tickets > 0 && work > 0) {
      monthlyValues[ym] = Math.round((tickets / work) * 100) / 100;
    }
  }
  return monthlyValues;
}

/** Year-to-date productivity result — average of monthly ticket/day values (Productivity tab AVG parity). */
function deriveProductivityResult(
  monthlyValues: Record<string, number>,
  year: number
): number | null {
  const values: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const ym = `${year}-${String(m).padStart(2, "0")}`;
    const value = monthlyValues[ym];
    if (value !== undefined) {
      values.push(value);
    }
  }
  if (values.length === 0) {
    return null;
  }
  return (
    Math.round(
      (values.reduce((sum, value) => sum + value, 0) / values.length) * 100
    ) / 100
  );
}

function deriveQuality(
  monthlyValues: Record<string, number> | null,
  reopenPercent: number | null,
  storedTotalByMar: number | null,
  year: number
) {
  const mv = monthlyValues ?? {};
  const monthValue = (m: number) => mv[`${year}-${String(m).padStart(2, "0")}`];
  let result = 0;
  for (let m = 1; m <= 12; m++) {
    result += monthValue(m) ?? 0;
  }
  const totalByMar =
    storedTotalByMar ??
    (monthValue(1) ?? 0) + (monthValue(2) ?? 0) + (monthValue(3) ?? 0);
  const reopenNumber =
    reopenPercent === null
      ? null
      : Math.round((totalByMar + result) * reopenPercent * 10) / 10;
  return { reopenNumber, result, totalByMar };
}

/** Reads employee.level and converts to title-case string for KPI snapshot. */
async function snapshotTitle(employeeId: string): Promise<string | null> {
  const [emp] = await db
    .select({ level: employee.level })
    .from(employee)
    .where(eq(employee.id, employeeId));
  if (!emp?.level) {
    return null;
  }
  return emp.level.charAt(0) + emp.level.slice(1).toLowerCase(); // "JUNIOR" → "Junior"
}

export const evaluationKpiRouter = {
  createProductivity: managerProcedure
    .input(
      z.object({
        employeeId: z.string().min(1),
        projectId: z.string().min(1),
        target: z.number().optional(),
        title: z.string().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const title = input.title ?? (await snapshotTitle(input.employeeId));
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(evaluationKpiProductivity)
        .values({ id, ...input, title })
        .returning();

      const performedBy = await resolvePerformedBy(context.session.user.id);
      await writeAudit({
        action: "CREATE_KPI",
        details: { kpiId: id, type: "productivity" },
        employeeId: input.employeeId,
        performedBy,
      });

      return created;
    }),

  createQuality: managerProcedure
    .input(
      z.object({
        employeeId: z.string().min(1),
        projectId: z.string().min(1),
        reopenPercent: z.number().optional(),
        title: z.string().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const title = input.title ?? (await snapshotTitle(input.employeeId));
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(evaluationKpiQuality)
        .values({ id, ...input, title })
        .returning();

      const performedBy = await resolvePerformedBy(context.session.user.id);
      await writeAudit({
        action: "CREATE_KPI",
        details: { kpiId: id, type: "quality" },
        employeeId: input.employeeId,
        performedBy,
      });

      return created;
    }),

  createSharing: managerProcedure
    .input(
      z.object({
        employeeId: z.string().min(1),
        projectId: z.string().min(1),
        target: z.number().optional(),
        title: z.string().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const title = input.title ?? (await snapshotTitle(input.employeeId));
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(evaluationKpiSharing)
        .values({ id, ...input, title })
        .returning();

      const performedBy = await resolvePerformedBy(context.session.user.id);
      await writeAudit({
        action: "CREATE_KPI",
        details: { kpiId: id, type: "sharing" },
        employeeId: input.employeeId,
        performedBy,
      });

      return created;
    }),

  createSummary: managerProcedure
    .input(
      z.object({
        employeeId: z.string().min(1),
        projectId: z.string().min(1),
        targetProductivity: z.number().optional(),
        targetReopen: z.number().optional(),
        targetSharing: z.number().optional(),
        title: z.string().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const title = input.title ?? (await snapshotTitle(input.employeeId));
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(evaluationKpiSummary)
        .values({ id, ...input, title })
        .returning();

      const performedBy = await resolvePerformedBy(context.session.user.id);
      await writeAudit({
        action: "CREATE_KPI",
        details: { kpiId: id, type: "summary" },
        employeeId: input.employeeId,
        performedBy,
      });

      return created;
    }),

  listProductivity: protectedProcedure.handler(async () => {
    const year = new Date().getFullYear();
    const maps = await loadProductivityAggregationMaps(year);

    const kpiRows = await db
      .select({
        ...getTableColumns(evaluationKpiProductivity),
        fullName: employee.fullName,
        projectName: project.name,
      })
      .from(evaluationKpiProductivity)
      .leftJoin(employee, eq(evaluationKpiProductivity.employeeId, employee.id))
      .leftJoin(project, eq(evaluationKpiProductivity.projectId, project.id))
      .orderBy(employee.fullName);

    return kpiRows.map((row) => ({
      ...row,
      monthlyValues: deriveProductivityMonthlyValues(
        row.employeeId,
        row.monthlyValues as Record<string, number> | null,
        year,
        maps
      ),
    }));
  }),

  listQuality: protectedProcedure.handler(async () => {
    const year = new Date().getFullYear();
    const rows = await db
      .select({
        ...getTableColumns(evaluationKpiQuality),
        fullName: employee.fullName,
        projectName: project.name,
      })
      .from(evaluationKpiQuality)
      .leftJoin(employee, eq(evaluationKpiQuality.employeeId, employee.id))
      .leftJoin(project, eq(evaluationKpiQuality.projectId, project.id))
      .orderBy(employee.fullName);
    // Derived values win over stored ones (legacy web behaviour)
    return rows.map((row) => ({
      ...row,
      ...deriveQuality(
        row.monthlyValues as Record<string, number> | null,
        row.reopenPercent,
        row.totalByMar,
        year
      ),
    }));
  }),

  listSharing: protectedProcedure.handler(async () => {
    const rows = await db
      .select({
        ...getTableColumns(evaluationKpiSharing),
        fullName: employee.fullName,
        projectName: project.name,
      })
      .from(evaluationKpiSharing)
      .leftJoin(employee, eq(evaluationKpiSharing.employeeId, employee.id))
      .leftJoin(project, eq(evaluationKpiSharing.projectId, project.id))
      .orderBy(employee.fullName);
    return rows;
  }),

  listSummary: protectedProcedure.handler(async () => {
    const year = new Date().getFullYear();
    const productivityMaps = await loadProductivityAggregationMaps(year);
    const rows = await db
      .select({
        comment: evaluationKpiSummary.comment,
        employeeId: evaluationKpiProductivity.employeeId,
        fullName: employee.fullName,
        id: evaluationKpiProductivity.id,
        productivityMonthlyValues: evaluationKpiProductivity.monthlyValues,
        projectId: evaluationKpiProductivity.projectId,
        projectName: project.name,
        qualityMonthlyValues: evaluationKpiQuality.monthlyValues,
        qualityReopenPercent: evaluationKpiQuality.reopenPercent,
        qualityTotalByMar: evaluationKpiQuality.totalByMar,
        resultProductivity: evaluationKpiProductivity.result,
        resultSharing: evaluationKpiSharing.result,
        targetProductivity: evaluationKpiProductivity.target,
        targetSharing: evaluationKpiSharing.target,
        title: evaluationKpiProductivity.title,
      })
      .from(evaluationKpiProductivity)
      .leftJoin(employee, eq(evaluationKpiProductivity.employeeId, employee.id))
      .leftJoin(project, eq(evaluationKpiProductivity.projectId, project.id))
      .leftJoin(
        evaluationKpiQuality,
        and(
          eq(
            evaluationKpiQuality.employeeId,
            evaluationKpiProductivity.employeeId
          ),
          eq(
            evaluationKpiQuality.projectId,
            evaluationKpiProductivity.projectId
          )
        )
      )
      .leftJoin(
        evaluationKpiSharing,
        and(
          eq(
            evaluationKpiSharing.employeeId,
            evaluationKpiProductivity.employeeId
          ),
          eq(
            evaluationKpiSharing.projectId,
            evaluationKpiProductivity.projectId
          )
        )
      )
      .leftJoin(
        evaluationKpiSummary,
        and(
          eq(
            evaluationKpiSummary.employeeId,
            evaluationKpiProductivity.employeeId
          ),
          eq(
            evaluationKpiSummary.projectId,
            evaluationKpiProductivity.projectId
          )
        )
      )
      .orderBy(employee.fullName);
    // Re-open target/result are bug counts: target = re-open budget number,
    // result = actual re-opens for the year (legacy web parity)
    return rows.map(
      ({
        productivityMonthlyValues,
        qualityMonthlyValues,
        qualityReopenPercent,
        qualityTotalByMar,
        resultProductivity: storedResultProductivity,
        ...row
      }) => {
        const monthlyValues = deriveProductivityMonthlyValues(
          row.employeeId,
          productivityMonthlyValues as Record<string, number> | null,
          year,
          productivityMaps
        );
        const derivedQuality = deriveQuality(
          qualityMonthlyValues as Record<string, number> | null,
          qualityReopenPercent,
          qualityTotalByMar,
          year
        );
        return {
          ...row,
          resultProductivity:
            deriveProductivityResult(monthlyValues, year) ??
            storedResultProductivity,
          resultReopen: derivedQuality.result,
          targetReopen: derivedQuality.reopenNumber,
        };
      }
    );
  }),

  updateProductivityMonth: managerProcedure
    .input(monthValueInput)
    .handler(async ({ context, input }) => {
      assertNotPastMonth(input.month);

      const [existing] = await db
        .select()
        .from(evaluationKpiProductivity)
        .where(eq(evaluationKpiProductivity.id, input.id));
      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      const monthlyValues = {
        ...(existing.monthlyValues as Record<string, number>),
        [input.month]: input.value,
      };
      const [updated] = await db
        .update(evaluationKpiProductivity)
        .set({ monthlyValues })
        .where(eq(evaluationKpiProductivity.id, input.id))
        .returning();

      const performedBy = await resolvePerformedBy(context.session.user.id);
      await writeAudit({
        action: "UPDATE_KPI",
        details: {
          kpiId: input.id,
          month: input.month,
          type: "productivity",
          value: input.value,
        },
        employeeId: existing.employeeId,
        performedBy,
      });

      return updated;
    }),

  updateQualityMonth: protectedProcedure
    .input(monthValueInput)
    .handler(async ({ context, input }) => {
      assertNotPastMonth(input.month);

      const [existing] = await db
        .select()
        .from(evaluationKpiQuality)
        .where(eq(evaluationKpiQuality.id, input.id));
      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      const { role, id: userId } = context.session.user;
      if (role === "EMPLOYEE") {
        const callerEmpId = await resolvePerformedBy(userId);
        if (!callerEmpId || callerEmpId !== existing.employeeId) {
          throw new ORPCError("FORBIDDEN", {
            message: "You can only update your own KPI data",
          });
        }
      }

      const monthlyValues = {
        ...(existing.monthlyValues as Record<string, number>),
        [input.month]: input.value,
      };
      const [updated] = await db
        .update(evaluationKpiQuality)
        .set({ monthlyValues })
        .where(eq(evaluationKpiQuality.id, input.id))
        .returning();

      const performedBy = await resolvePerformedBy(context.session.user.id);
      await writeAudit({
        action: "UPDATE_KPI",
        details: {
          kpiId: input.id,
          month: input.month,
          type: "quality",
          value: input.value,
        },
        employeeId: existing.employeeId,
        performedBy,
      });

      return updated;
    }),

  updateQualityTotals: managerProcedure
    .input(
      z.object({
        id: z.string(),
        reopenNumber: z.number().optional(),
        reopenPercent: z.number().optional(),
        result: z.number().optional(),
        totalByMar: z.number().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const { id, ...data } = input;
      const [existing] = await db
        .select()
        .from(evaluationKpiQuality)
        .where(eq(evaluationKpiQuality.id, id));
      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      const [updated] = await db
        .update(evaluationKpiQuality)
        .set(data)
        .where(eq(evaluationKpiQuality.id, id))
        .returning();

      const performedBy = await resolvePerformedBy(context.session.user.id);
      await writeAudit({
        action: "UPDATE_KPI",
        details: { changes: data, kpiId: id, type: "quality_totals" },
        employeeId: existing.employeeId,
        performedBy,
      });

      return updated;
    }),

  updateSharingMonth: protectedProcedure
    .input(monthValueInput)
    .handler(async ({ context, input }) => {
      assertNotPastMonth(input.month);

      const [existing] = await db
        .select()
        .from(evaluationKpiSharing)
        .where(eq(evaluationKpiSharing.id, input.id));
      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      const { role, id: userId } = context.session.user;
      if (role === "EMPLOYEE") {
        const callerEmpId = await resolvePerformedBy(userId);
        if (!callerEmpId || callerEmpId !== existing.employeeId) {
          throw new ORPCError("FORBIDDEN", {
            message: "You can only update your own KPI data",
          });
        }
      }

      const monthlyValues = {
        ...(existing.monthlyValues as Record<string, number>),
        [input.month]: input.value,
      };
      const [updated] = await db
        .update(evaluationKpiSharing)
        .set({ monthlyValues })
        .where(eq(evaluationKpiSharing.id, input.id))
        .returning();

      const performedBy = await resolvePerformedBy(context.session.user.id);
      await writeAudit({
        action: "UPDATE_KPI",
        details: {
          kpiId: input.id,
          month: input.month,
          type: "sharing",
          value: input.value,
        },
        employeeId: existing.employeeId,
        performedBy,
      });

      return updated;
    }),

  updateSummaryComment: managerProcedure
    .input(
      z.object({
        comment: z.string(),
        employeeId: z.string(),
        projectId: z.string(),
      })
    )
    .handler(async ({ context, input }) => {
      await db
        .insert(evaluationKpiSummary)
        .values({
          comment: input.comment,
          employeeId: input.employeeId,
          id: crypto.randomUUID(),
          projectId: input.projectId,
        })
        .onConflictDoUpdate({
          set: { comment: input.comment },
          target: [
            evaluationKpiSummary.employeeId,
            evaluationKpiSummary.projectId,
          ],
        });

      const performedBy = await resolvePerformedBy(context.session.user.id);
      await writeAudit({
        action: "UPDATE_KPI",
        details: { comment: input.comment, type: "summary_comment" },
        employeeId: input.employeeId,
        performedBy,
      });

      return { success: true };
    }),
};
