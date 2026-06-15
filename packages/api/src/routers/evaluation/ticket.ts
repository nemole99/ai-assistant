import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { employee, project } from "@workspace/db/schema/auth";
import { evaluationTicket } from "@workspace/db/schema/evaluation";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { managerProcedure, protectedProcedure } from "../../index";
import {
  assertEmployeeActive,
  resolvePerformedBy,
  writeAudit,
} from "./helpers";

async function assertTicketUrlUnique(ticketUrl: string, excludeId?: string) {
  const [dup] = await db
    .select({ id: evaluationTicket.id })
    .from(evaluationTicket)
    .where(
      excludeId
        ? and(
            eq(evaluationTicket.ticketUrl, ticketUrl),
            sql`${evaluationTicket.id} != ${excludeId}`
          )
        : eq(evaluationTicket.ticketUrl, ticketUrl)
    );
  if (dup) {
    throw new ORPCError("CONFLICT", {
      message: `A ticket with URL "${ticketUrl}" already exists`,
    });
  }
}

function monthDateRange(month: string): { endDate: string; startDate: string } {
  const startDate = `${month}-01`;
  const [year, monthStr] = month.split("-");
  const nextMonth =
    Number(monthStr) === 12
      ? `${Number(year) + 1}-01`
      : `${year}-${String(Number(monthStr) + 1).padStart(2, "0")}`;
  return { endDate: `${nextMonth}-01`, startDate };
}

const insertTicketInput = z.object({
  category: z.enum(["bug", "feature"]),
  codeFixActual: z.number().min(0),
  codeFixEstimate: z.number().min(0),
  codeReviewActual: z.number().min(0),
  codeReviewEstimate: z.number().min(0),
  comment: z.string().optional(),
  employeeId: z.string().min(1),
  investigateActual: z.number().min(0),
  investigateEstimate: z.number().min(0),
  processDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  projectId: z.string().min(1),
  reopenStatus: z.number().int().min(0).default(0),
  ticketUrl: z.string().url(),
  totalEffort: z.number().positive().nullable().optional(),
});

export const evaluationTicketRouter = {
  chartData: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(async ({ input }) => {
      const { endDate, startDate } = monthDateRange(input.month);

      const rows = await db
        .select({
          count: count(),
          employeeId: evaluationTicket.employeeId,
          fullName: employee.fullName,
        })
        .from(evaluationTicket)
        .innerJoin(employee, eq(evaluationTicket.employeeId, employee.id))
        .where(
          and(
            sql`${evaluationTicket.processDate} >= ${startDate}`,
            sql`${evaluationTicket.processDate} < ${endDate}`
          )
        )
        .groupBy(evaluationTicket.employeeId, employee.fullName);

      return { data: rows, month: input.month };
    }),

  create: protectedProcedure
    .input(insertTicketInput)
    .handler(async ({ context, input }) => {
      const { role, id: userId } = context.session.user;
      const isManager = role === "ADMIN" || role === "MANAGER";

      if (!isManager) {
        const performedBy = await resolvePerformedBy(userId);
        if (!performedBy || performedBy !== input.employeeId) {
          throw new ORPCError("FORBIDDEN", {
            message: "You can only create tickets for yourself",
          });
        }
      }

      await assertEmployeeActive(input.employeeId);
      await assertTicketUrlUnique(input.ticketUrl);

      const id = crypto.randomUUID();
      const [created] = await db
        .insert(evaluationTicket)
        .values({ id, ...input })
        .returning();
      if (!created) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      const performedBy = await resolvePerformedBy(userId);
      await writeAudit({
        action: "CREATE_TICKET",
        details: {
          projectId: input.projectId,
          ticketId: id,
          ticketUrl: input.ticketUrl,
        },
        employeeId: input.employeeId,
        performedBy,
      });

      return created;
    }),

  delete: managerProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      const [existing] = await db
        .select()
        .from(evaluationTicket)
        .where(eq(evaluationTicket.id, input.id));
      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      await db
        .delete(evaluationTicket)
        .where(eq(evaluationTicket.id, input.id));

      const performedBy = await resolvePerformedBy(context.session.user.id);
      await writeAudit({
        action: "DELETE_TICKET",
        details: { ticketId: input.id, ticketUrl: existing.ticketUrl },
        employeeId: existing.employeeId,
        performedBy,
      });

      return { success: true };
    }),

  efficiencyData: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(async ({ input }) => {
      const { endDate, startDate } = monthDateRange(input.month);

      const rows = await db
        .select({
          avgCodeFixAct: sql<number>`avg(${evaluationTicket.codeFixActual})`,
          avgCodeFixEst: sql<number>`avg(${evaluationTicket.codeFixEstimate})`,
          avgCodeReviewAct: sql<number>`avg(${evaluationTicket.codeReviewActual})`,
          avgCodeReviewEst: sql<number>`avg(${evaluationTicket.codeReviewEstimate})`,
          avgInvestigateAct: sql<number>`avg(${evaluationTicket.investigateActual})`,
          avgInvestigateEst: sql<number>`avg(${evaluationTicket.investigateEstimate})`,
          employeeId: evaluationTicket.employeeId,
          fullName: employee.fullName,
        })
        .from(evaluationTicket)
        .innerJoin(employee, eq(evaluationTicket.employeeId, employee.id))
        .where(
          and(
            sql`${evaluationTicket.processDate} >= ${startDate}`,
            sql`${evaluationTicket.processDate} < ${endDate}`
          )
        )
        .groupBy(evaluationTicket.employeeId, employee.fullName);

      const data = rows.map((row) => ({
        codeEff:
          row.avgCodeFixEst > 0
            ? ((row.avgCodeFixEst - row.avgCodeFixAct) / row.avgCodeFixEst) *
              100
            : 0,
        employeeId: row.employeeId,
        fullName: row.fullName,
        investigateEff:
          row.avgInvestigateEst > 0
            ? ((row.avgInvestigateEst - row.avgInvestigateAct) /
                row.avgInvestigateEst) *
              100
            : 0,
        reviewEff:
          row.avgCodeReviewEst > 0
            ? ((row.avgCodeReviewEst - row.avgCodeReviewAct) /
                row.avgCodeReviewEst) *
              100
            : 0,
      }));

      return { data, month: input.month };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const [row] = await db
        .select()
        .from(evaluationTicket)
        .where(eq(evaluationTicket.id, input.id));
      if (!row) {
        throw new ORPCError("NOT_FOUND");
      }
      return row;
    }),

  import: managerProcedure
    .input(
      z.object({
        tickets: z.array(
          z.object({
            category: z.enum(["bug", "feature"]),
            codeFixActual: z.number().min(0),
            codeFixEstimate: z.number().min(0),
            codeReviewActual: z.number().min(0),
            codeReviewEstimate: z.number().min(0),
            comment: z.string().optional(),
            employeeId: z.string().min(1),
            investigateActual: z.number().min(0),
            investigateEstimate: z.number().min(0),
            processDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            projectId: z.string().min(1),
            reopenStatus: z.number().int().min(0).default(0),
            ticketUrl: z.string().url(),
            totalEffort: z.number().positive().nullable().optional(),
          })
        ),
      })
    )
    .handler(async ({ context, input }) => {
      const results = { errors: [] as string[], imported: 0 };
      const performedBy = await resolvePerformedBy(context.session.user.id);

      for (const ticket of input.tickets) {
        const [dup] = await db
          .select({ id: evaluationTicket.id })
          .from(evaluationTicket)
          .where(eq(evaluationTicket.ticketUrl, ticket.ticketUrl));
        if (dup) {
          results.errors.push(`Duplicate ticket URL: ${ticket.ticketUrl}`);
          continue;
        }

        const id = crypto.randomUUID();
        await db.insert(evaluationTicket).values({ id, ...ticket });

        await writeAudit({
          action: "IMPORT_TICKET",
          details: { ticketId: id, ticketUrl: ticket.ticketUrl },
          employeeId: ticket.employeeId,
          performedBy,
        });

        results.imported++;
      }

      return results;
    }),

  latestMonth: protectedProcedure.handler(async () => {
    const [row] = await db
      .select({
        latest: sql<
          string | null
        >`to_char(max(${evaluationTicket.processDate}), 'YYYY-MM')`,
      })
      .from(evaluationTicket);
    return { month: row?.latest ?? null };
  }),

  list: protectedProcedure
    .input(
      z
        .object({
          category: z.enum(["bug", "feature"]).optional(),
          employeeId: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          month: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional(),
          page: z.number().int().min(1).default(1),
          projectId: z.string().optional(),
          ticket: z.string().optional(),
        })
        .optional()
    )
    .handler(async ({ input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 50;
      const offset = (page - 1) * limit;

      const conditions = [];

      if (input?.month) {
        const { endDate, startDate } = monthDateRange(input.month);
        conditions.push(sql`${evaluationTicket.processDate} >= ${startDate}`);
        conditions.push(sql`${evaluationTicket.processDate} < ${endDate}`);
      }

      if (input?.employeeId) {
        conditions.push(eq(evaluationTicket.employeeId, input.employeeId));
      }

      if (input?.projectId) {
        conditions.push(eq(evaluationTicket.projectId, input.projectId));
      }

      if (input?.category) {
        conditions.push(eq(evaluationTicket.category, input.category));
      }

      if (input?.ticket) {
        conditions.push(
          sql`${evaluationTicket.ticketUrl} ILIKE ${`%${input.ticket}%`}`
        );
      }

      const whereCondition =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ count: count() })
        .from(evaluationTicket)
        .where(whereCondition);

      const data = await db
        .select({
          category: evaluationTicket.category,
          codeFixActual: evaluationTicket.codeFixActual,
          codeFixEstimate: evaluationTicket.codeFixEstimate,
          codeReviewActual: evaluationTicket.codeReviewActual,
          codeReviewEstimate: evaluationTicket.codeReviewEstimate,
          comment: evaluationTicket.comment,
          createdAt: evaluationTicket.createdAt,
          employeeId: evaluationTicket.employeeId,
          fullName: employee.fullName,
          id: evaluationTicket.id,
          investigateActual: evaluationTicket.investigateActual,
          investigateEstimate: evaluationTicket.investigateEstimate,
          processDate: evaluationTicket.processDate,
          projectId: evaluationTicket.projectId,
          projectName: project.name,
          reopenStatus: evaluationTicket.reopenStatus,
          ticketUrl: evaluationTicket.ticketUrl,
          totalEffort: evaluationTicket.totalEffort,
          updatedAt: evaluationTicket.updatedAt,
        })
        .from(evaluationTicket)
        .innerJoin(employee, eq(evaluationTicket.employeeId, employee.id))
        .innerJoin(project, eq(evaluationTicket.projectId, project.id))
        .where(whereCondition)
        .orderBy(desc(evaluationTicket.processDate))
        .limit(limit)
        .offset(offset);

      return {
        data,
        limit,
        page,
        total: totalResult?.count ?? 0,
        totalPages: Math.ceil((totalResult?.count ?? 0) / limit),
      };
    }),

  listDevelopers: protectedProcedure.handler(async () => {
    const rows = await db
      .select({ fullName: employee.fullName, id: employee.id })
      .from(employee)
      .where(eq(employee.status, "ACTIVE"))
      .orderBy(employee.fullName);
    return rows;
  }),

  listProjects: protectedProcedure.handler(async () => {
    const rows = await db
      .select({ id: project.id, name: project.name })
      .from(project)
      .orderBy(project.name);
    return rows;
  }),

  update: protectedProcedure
    .input(
      z.object({
        data: insertTicketInput.partial(),
        id: z.string(),
      })
    )
    .handler(async ({ context, input }) => {
      const [existing] = await db
        .select()
        .from(evaluationTicket)
        .where(eq(evaluationTicket.id, input.id));
      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      const { role, id: userId } = context.session.user;
      const isManager = role === "ADMIN" || role === "MANAGER";

      if (!isManager) {
        const callerEmpId = await resolvePerformedBy(userId);
        if (!callerEmpId || callerEmpId !== existing.employeeId) {
          throw new ORPCError("FORBIDDEN", {
            message: "You can only update your own tickets",
          });
        }
      }

      if (input.data.employeeId) {
        await assertEmployeeActive(input.data.employeeId);
      }

      if (input.data.ticketUrl) {
        await assertTicketUrlUnique(input.data.ticketUrl, input.id);
      }

      const [updated] = await db
        .update(evaluationTicket)
        .set(input.data)
        .where(eq(evaluationTicket.id, input.id))
        .returning();

      const performedBy = await resolvePerformedBy(userId);
      await writeAudit({
        action: "UPDATE_TICKET",
        details: { changes: input.data, ticketId: input.id },
        employeeId: updated!.employeeId,
        performedBy,
      });

      return updated;
    }),
};
