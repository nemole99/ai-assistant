import { db } from "@workspace/db";
import { employee } from "@workspace/db/schema/auth";
import { evaluationAuditLog } from "@workspace/db/schema/evaluation";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";

export const evaluationAuditRouter = {
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(500).default(100),
          month: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional(),
        })
        .optional()
    )
    .handler(async ({ input }) => {
      const limit = input?.limit ?? 100;
      const performerAlias = employee;

      const conditions = [];
      if (input?.month) {
        const startDate = `${input.month}-01T00:00:00.000Z`;
        const [year, monthStr] = input.month.split("-");
        const nextMonth =
          Number(monthStr) === 12
            ? `${Number(year) + 1}-01`
            : `${year}-${String(Number(monthStr) + 1).padStart(2, "0")}`;
        const endDate = `${nextMonth}-01T00:00:00.000Z`;
        conditions.push(sql`${evaluationAuditLog.createdAt} >= ${startDate}`);
        conditions.push(sql`${evaluationAuditLog.createdAt} < ${endDate}`);
      }

      const whereCondition =
        conditions.length > 0 ? and(...conditions) : undefined;

      return await db
        .select({
          action: evaluationAuditLog.action,
          createdAt: evaluationAuditLog.createdAt,
          details: evaluationAuditLog.details,
          employeeId: evaluationAuditLog.employeeId,
          id: evaluationAuditLog.id,
          performedBy: evaluationAuditLog.performedBy,
          performedByName: performerAlias.fullName,
        })
        .from(evaluationAuditLog)
        .leftJoin(
          performerAlias,
          eq(evaluationAuditLog.performedBy, performerAlias.id)
        )
        .where(whereCondition)
        .orderBy(desc(evaluationAuditLog.createdAt))
        .limit(limit);
    }),
};
