import { db } from "@workspace/db";
import {
  copilotKpiProductivity,
  copilotKpiSharing,
  copilotKpiQuality,
  copilotKpiSummary,
} from "@workspace/db/schema/copilot-evaluation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { protectedProcedure, managerProcedure } from "../../index";

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Returns true if the short month name (e.g. "apr") is strictly before the current month */
function isPastMonth(monthKey: string): boolean {
  const idx = MONTH_INDEX[monthKey.toLowerCase()];
  if (idx === undefined) return false;
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
  // --- Productivity KPI ---
  listProductivity: protectedProcedure.handler(async () => {
    return db.select().from(copilotKpiProductivity).orderBy(copilotKpiProductivity.developer);
  }),

  createProductivity: managerProcedure
    .input(
      z.object({
        developer: z.string().min(1),
        project: z.string().min(1),
        title: z.string().optional(),
        target: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(copilotKpiProductivity)
        .values({ id, ...input })
        .returning();
      return created;
    }),

  updateProductivityMonth: managerProcedure
    .input(monthValueInput)
    .handler(async ({ input }) => {
      assertNotPastMonth(input.month);

      const [existing] = await db
        .select()
        .from(copilotKpiProductivity)
        .where(eq(copilotKpiProductivity.id, input.id));
      if (!existing) throw new ORPCError("NOT_FOUND");

      const monthlyValues = { ...(existing.monthlyValues as Record<string, number>), [input.month]: input.value };
      const [updated] = await db
        .update(copilotKpiProductivity)
        .set({ monthlyValues })
        .where(eq(copilotKpiProductivity.id, input.id))
        .returning();
      return updated;
    }),

  // --- Sharing KPI ---
  listSharing: protectedProcedure.handler(async () => {
    return db.select().from(copilotKpiSharing).orderBy(copilotKpiSharing.developer);
  }),

  createSharing: managerProcedure
    .input(
      z.object({
        developer: z.string().min(1),
        project: z.string().min(1),
        title: z.string().optional(),
        target: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(copilotKpiSharing)
        .values({ id, ...input })
        .returning();
      return created;
    }),

  updateSharingMonth: managerProcedure
    .input(monthValueInput)
    .handler(async ({ input }) => {
      assertNotPastMonth(input.month);

      const [existing] = await db
        .select()
        .from(copilotKpiSharing)
        .where(eq(copilotKpiSharing.id, input.id));
      if (!existing) throw new ORPCError("NOT_FOUND");

      const monthlyValues = { ...(existing.monthlyValues as Record<string, number>), [input.month]: input.value };
      const [updated] = await db
        .update(copilotKpiSharing)
        .set({ monthlyValues })
        .where(eq(copilotKpiSharing.id, input.id))
        .returning();
      return updated;
    }),

  // --- Quality KPI ---
  listQuality: protectedProcedure.handler(async () => {
    return db.select().from(copilotKpiQuality).orderBy(copilotKpiQuality.developer);
  }),

  createQuality: managerProcedure
    .input(
      z.object({
        developer: z.string().min(1),
        project: z.string().min(1),
        title: z.string().optional(),
        reopenPercent: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(copilotKpiQuality)
        .values({ id, ...input })
        .returning();
      return created;
    }),

  updateQualityMonth: managerProcedure
    .input(monthValueInput)
    .handler(async ({ input }) => {
      assertNotPastMonth(input.month);

      const [existing] = await db
        .select()
        .from(copilotKpiQuality)
        .where(eq(copilotKpiQuality.id, input.id));
      if (!existing) throw new ORPCError("NOT_FOUND");

      const monthlyValues = { ...(existing.monthlyValues as Record<string, number>), [input.month]: input.value };
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
      if (!existing) throw new ORPCError("NOT_FOUND");

      const [updated] = await db
        .update(copilotKpiQuality)
        .set({ totalByMar: input.value })
        .where(eq(copilotKpiQuality.id, input.id))
        .returning();
      return updated;
    }),

  // --- Summary KPI ---
  listSummary: protectedProcedure.handler(async () => {
    return db.select().from(copilotKpiSummary).orderBy(copilotKpiSummary.developer);
  }),

  createSummary: managerProcedure
    .input(
      z.object({
        developer: z.string().min(1),
        project: z.string().min(1),
        title: z.string().optional(),
        targetProductivity: z.number().optional(),
        targetReopen: z.number().optional(),
        targetSharing: z.number().optional(),
      }),
    )
    .handler(async ({ input }) => {
      const id = crypto.randomUUID();
      const [created] = await db
        .insert(copilotKpiSummary)
        .values({ id, ...input })
        .returning();
      return created;
    }),

  updateSummaryComment: managerProcedure
    .input(z.object({ id: z.string(), comment: z.string() }))
    .handler(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(copilotKpiSummary)
        .where(eq(copilotKpiSummary.id, input.id));
      if (!existing) throw new ORPCError("NOT_FOUND");

      const [updated] = await db
        .update(copilotKpiSummary)
        .set({ comment: input.comment })
        .where(eq(copilotKpiSummary.id, input.id))
        .returning();
      return updated;
    }),
};
