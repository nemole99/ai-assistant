import { db } from "@workspace/db";
import { copilotAuditLog } from "@workspace/db/schema/copilot-evaluation";
import { desc, and, sql } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";

export const copilotAuditRouter = {
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

      if (input?.month) {
        const startDate = `${input.month}-01T00:00:00.000Z`;
        const [year, monthStr] = input.month.split("-");
        const nextMonth =
          Number(monthStr) === 12
            ? `${Number(year) + 1}-01`
            : `${year}-${String(Number(monthStr) + 1).padStart(2, "0")}`;
        const endDate = `${nextMonth}-01T00:00:00.000Z`;

        return await db
          .select()
          .from(copilotAuditLog)
          .where(
            and(
              sql`${copilotAuditLog.createdAt} >= ${startDate}`,
              sql`${copilotAuditLog.createdAt} < ${endDate}`
            )
          )
          .orderBy(desc(copilotAuditLog.createdAt))
          .limit(limit);
      }

      return await db
        .select()
        .from(copilotAuditLog)
        .orderBy(desc(copilotAuditLog.createdAt))
        .limit(limit);
    }),
};
