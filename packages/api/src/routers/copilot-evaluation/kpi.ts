import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import {
  copilotKpiProductivity,
  copilotKpiSharing,
  copilotKpiQuality,
  copilotKpiSummary,
} from "@workspace/db/schema/copilot-evaluation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, managerProcedure } from "../../index";

const MONTH_INDEX: Record<string, number> = {
  apr: 3,
  aug: 7,
  dec: 11,
  feb: 1,
  jan: 0,
  jul: 6,
  jun: 5,
  mar: 2,
  may: 4,
  nov: 10,
  oct: 9,
  sep: 8,
};

/** Returns true if the short month name (e.g. "apr") is strictly before the current month */
function isPastMonth(monthKey: string): boolean {
  const idx = MONTH_INDEX[monthKey.toLowerCase()];
  if (idx === undefined) {
    return false;
  }
  const now = new Date();
  return idx < now.getMonth();
}

function assertNotPastMonth(monthKey: string) {
  if (isPastMonth(monthKey)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Cannot modify KPI data for past months",
    });
  }
}

const monthValueInput = z.object({
  id: z.string(),
  month: z.string().min(1), // e.g., "jan", "feb", etc.
  value: z.number(),
});

export const copilotKpiRouter = {
  createProductivity: managerProcedure
    .input(
      z.object({
        developer: z.string().min(1),
        project: z.string().min(1),
        target: z.number().optional(),
        title: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(copilotKpiProductivity)
        .values({ id, ...input })
        .returning();
      return created;
    }),

  createQuality: managerProcedure
    .input(
      z.object({
        developer: z.string().min(1),
        project: z.string().min(1),
        reopenPercent: z.number().optional(),
        title: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(copilotKpiQuality)
        .values({ id, ...input })
        .returning();
      return created;
    }),

  createSharing: managerProcedure
    .input(
      z.object({
        developer: z.string().min(1),
        project: z.string().min(1),
        target: z.number().optional(),
        title: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(copilotKpiSharing)
        .values({ id, ...input })
        .returning();
      return created;
    }),

  createSummary: managerProcedure
    .input(
      z.object({
        developer: z.string().min(1),
        project: z.string().min(1),
        targetProductivity: z.number().optional(),
        targetReopen: z.number().optional(),
        targetSharing: z.number().optional(),
        title: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(copilotKpiSummary)
        .values({ id, ...input })
        .returning();
      return created;
    }),

  listProductivity: protectedProcedure.handler(() =>
    db
      .select()
      .from(copilotKpiProductivity)
      .orderBy(copilotKpiProductivity.developer)
  ),

  listQuality: protectedProcedure.handler(() =>
    db.select().from(copilotKpiQuality).orderBy(copilotKpiQuality.developer)
  ),

  listSharing: protectedProcedure.handler(() =>
    db.select().from(copilotKpiSharing).orderBy(copilotKpiSharing.developer)
  ),

  listSummary: protectedProcedure.handler(() =>
    db.select().from(copilotKpiSummary).orderBy(copilotKpiSummary.developer)
  ),

  updateProductivityMonth: managerProcedure
    .input(monthValueInput)
    .handler(async ({ input }) => {
      assertNotPastMonth(input.month);

      const [existing] = await db
        .select()
        .from(copilotKpiProductivity)
        .where(eq(copilotKpiProductivity.id, input.id));
      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      const monthlyValues = {
        ...(existing.monthlyValues as Record<string, number>),
        [input.month]: input.value,
      };
      const [updated] = await db
        .update(copilotKpiProductivity)
        .set({ monthlyValues })
        .where(eq(copilotKpiProductivity.id, input.id))
        .returning();
      return updated;
    }),

  updateQualityMonth: managerProcedure
    .input(monthValueInput)
    .handler(async ({ input }) => {
      assertNotPastMonth(input.month);

      const [existing] = await db
        .select()
        .from(copilotKpiQuality)
        .where(eq(copilotKpiQuality.id, input.id));
      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      const monthlyValues = {
        ...(existing.monthlyValues as Record<string, number>),
        [input.month]: input.value,
      };
      const [updated] = await db
        .update(copilotKpiQuality)
        .set({ monthlyValues })
        .where(eq(copilotKpiQuality.id, input.id))
        .returning();
      return updated;
    }),

  updateQualityTotalByMar: managerProcedure
    .input(z.object({ id: z.string(), value: z.number() }))
    .handler(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(copilotKpiQuality)
        .where(eq(copilotKpiQuality.id, input.id));
      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      const [updated] = await db
        .update(copilotKpiQuality)
        .set({ totalByMar: input.value })
        .where(eq(copilotKpiQuality.id, input.id))
        .returning();
      return updated;
    }),

  updateSharingMonth: managerProcedure
    .input(monthValueInput)
    .handler(async ({ input }) => {
      assertNotPastMonth(input.month);

      const [existing] = await db
        .select()
        .from(copilotKpiSharing)
        .where(eq(copilotKpiSharing.id, input.id));
      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      const monthlyValues = {
        ...(existing.monthlyValues as Record<string, number>),
        [input.month]: input.value,
      };
      const [updated] = await db
        .update(copilotKpiSharing)
        .set({ monthlyValues })
        .where(eq(copilotKpiSharing.id, input.id))
        .returning();
      return updated;
    }),

  updateSummaryComment: managerProcedure
    .input(z.object({ comment: z.string(), id: z.string() }))
    .handler(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(copilotKpiSummary)
        .where(eq(copilotKpiSummary.id, input.id));
      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      const [updated] = await db
        .update(copilotKpiSummary)
        .set({ comment: input.comment })
        .where(eq(copilotKpiSummary.id, input.id))
        .returning();
      return updated;
    }),
};
