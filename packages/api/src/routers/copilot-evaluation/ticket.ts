import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { employee } from "@workspace/db/schema/auth";
import {
  copilotTicket,
  copilotAuditLog,
} from "@workspace/db/schema/copilot-evaluation";
import {
  insertCopilotTicketSchema,
  updateCopilotTicketSchema,
} from "@workspace/db/schema/validation";
import { eq, and, sql, count } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, managerProcedure } from "../../index";

/** Normalize developer field: convert emails to first name (capitalized) */
function normalizeDeveloper(raw: string): string {
  if (raw.includes("@")) {
    const localPart = raw.split("@")[0]!;
    const firstName = localPart.split(".")[0]!;
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }
  return raw;
}

/** Canonical project list */
const CANONICAL_PROJECTS = [
  "Bontech V1",
  "Clever One",
  "CleverDent",
  "CleverRC",
  "EzSeries",
  "GPP",
  "IDP",
  "LMP",
  "Other",
  "RY",
  "WeClever",
  "XmaruC",
  "XmaruPACS",
  "XmaruPro",
  "XmaruW",
] as const;

/** Ticket prefix → canonical project (unambiguous mappings only) */
const PREFIX_TO_PROJECT: Record<string, string> = {
  CONE: "Clever One",
  EEEN: "EzSeries",
  ETWO: "EzSeries",
  EVNCRC: "CleverRC",
  EVNGPP: "GPP",
  EVNIDP: "IDP",
  EVNL: "LMP",
  EVNWCL: "WeClever",
  GPMS: "CleverDent",
  VCTV: "EzSeries",
};

/** Case-insensitive alias → canonical project */
const PROJECT_ALIASES: Record<string, string> = {
  we: "WeClever",
  weclever: "WeClever",
};

/** Normalize project name using aliases and optional ticket prefix */
function normalizeProject(raw: string, ticketUrl?: string): string {
  // Check aliases (case-insensitive)
  const alias = PROJECT_ALIASES[raw.toLowerCase()];
  if (alias) {
    return alias;
  }

  // Check ticket prefix for unambiguous mapping
  if (ticketUrl) {
    const match = ticketUrl.match(/([A-Z][A-Z0-9]+)-\d+/);
    if (match) {
      const prefixProject = PREFIX_TO_PROJECT[match[1]!];
      if (prefixProject) {
        return prefixProject;
      }
    }
  }

  return raw;
}

export const copilotTicketRouter = {
  chartData: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(async ({ input }) => {
      const startDate = `${input.month}-01`;
      const [year, monthStr] = input.month.split("-");
      const nextMonth =
        Number(monthStr) === 12
          ? `${Number(year) + 1}-01`
          : `${year}-${String(Number(monthStr) + 1).padStart(2, "0")}`;
      const endDate = `${nextMonth}-01`;

      const rows = await db
        .select({
          count: count(),
          developer: copilotTicket.developer,
        })
        .from(copilotTicket)
        .where(
          and(
            sql`${copilotTicket.processDate} >= ${startDate}`,
            sql`${copilotTicket.processDate} < ${endDate}`
          )
        )
        .groupBy(copilotTicket.developer);

      return { data: rows, month: input.month };
    }),

  create: managerProcedure
    .input(insertCopilotTicketSchema)
    .handler(async ({ input }) => {
      const [existing] = await db
        .select({ id: copilotTicket.id })
        .from(copilotTicket)
        .where(eq(copilotTicket.ticketUrl, input.ticketUrl));
      if (existing) {
        throw new ORPCError("CONFLICT", {
          message: "A ticket with this URL already exists",
        });
      }

      const id = crypto.randomUUID();
      const [created] = await db
        .insert(copilotTicket)
        .values({
          id,
          ...input,
          developer: normalizeDeveloper(input.developer),
          project: normalizeProject(input.project, input.ticketUrl),
        })
        .returning();
      if (!created) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

      await db.insert(copilotAuditLog).values({
        action: "CREATE_TICKET",
        details: {
          project: input.project,
          ticketId: id,
          ticketUrl: input.ticketUrl,
        },
        developer: input.developer,
        id: crypto.randomUUID(),
      });

      return created;
    }),

  delete: managerProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(copilotTicket)
        .where(eq(copilotTicket.id, input.id));
      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      await db.delete(copilotTicket).where(eq(copilotTicket.id, input.id));

      await db.insert(copilotAuditLog).values({
        action: "DELETE_TICKET",
        details: { ticketId: input.id, ticketUrl: existing.ticketUrl },
        developer: existing.developer,
        id: crypto.randomUUID(),
      });

      return { success: true };
    }),

  efficiencyData: protectedProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .handler(async ({ input }) => {
      const startDate = `${input.month}-01`;
      const [year, monthStr] = input.month.split("-");
      const nextMonth =
        Number(monthStr) === 12
          ? `${Number(year) + 1}-01`
          : `${year}-${String(Number(monthStr) + 1).padStart(2, "0")}`;
      const endDate = `${nextMonth}-01`;

      const rows = await db
        .select({
          avgCodeFixAct: sql<number>`avg(${copilotTicket.codeFixActual})`,
          avgCodeFixEst: sql<number>`avg(${copilotTicket.codeFixEstimate})`,
          avgCodeReviewAct: sql<number>`avg(${copilotTicket.codeReviewActual})`,
          avgCodeReviewEst: sql<number>`avg(${copilotTicket.codeReviewEstimate})`,
          avgInvestigateAct: sql<number>`avg(${copilotTicket.investigateActual})`,
          avgInvestigateEst: sql<number>`avg(${copilotTicket.investigateEstimate})`,
          developer: copilotTicket.developer,
        })
        .from(copilotTicket)
        .where(
          and(
            sql`${copilotTicket.processDate} >= ${startDate}`,
            sql`${copilotTicket.processDate} < ${endDate}`
          )
        )
        .groupBy(copilotTicket.developer);

      const data = rows.map((row) => ({
        codeEff:
          row.avgCodeFixEst > 0
            ? ((row.avgCodeFixEst - row.avgCodeFixAct) / row.avgCodeFixEst) *
              100
            : 0,
        developer: row.developer,
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
        .from(copilotTicket)
        .where(eq(copilotTicket.id, input.id));
      if (!row) {
        throw new ORPCError("NOT_FOUND");
      }
      return row;
    }),

  import: managerProcedure
    .input(
      z.object({
        tickets: z.array(insertCopilotTicketSchema),
      })
    )
    .handler(async ({ input }) => {
      const results = { errors: [] as string[], imported: 0 };

      for (const ticket of input.tickets) {
        const calculated = {
          ...ticket,
          codeFixEstimate: ticket.totalEffort * 0.4,
          codeReviewEstimate: ticket.totalEffort * 0.15,
          developer: normalizeDeveloper(ticket.developer),
          investigateEstimate: ticket.totalEffort * 0.2,
          project: normalizeProject(ticket.project, ticket.ticketUrl),
        };

        const [existing] = await db
          .select({ id: copilotTicket.id })
          .from(copilotTicket)
          .where(eq(copilotTicket.ticketUrl, ticket.ticketUrl));
        if (existing) {
          results.errors.push(`Duplicate ticket URL: ${ticket.ticketUrl}`);
          continue;
        }

        const id = crypto.randomUUID();
        await db.insert(copilotTicket).values({ id, ...calculated });

        await db.insert(copilotAuditLog).values({
          action: "IMPORT_TICKET",
          details: { ticketId: id, ticketUrl: ticket.ticketUrl },
          developer: ticket.developer,
          id: crypto.randomUUID(),
        });

        results.imported++;
      }

      return results;
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          category: z.enum(["bug", "feature"]).optional(),
          developer: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          month: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional(),
          page: z.number().int().min(1).default(1),
          project: z.string().optional(),
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
        const startDate = `${input.month}-01`;
        const [year, monthStr] = input.month.split("-");
        const nextMonth =
          Number(monthStr) === 12
            ? `${Number(year) + 1}-01`
            : `${year}-${String(Number(monthStr) + 1).padStart(2, "0")}`;
        const endDate = `${nextMonth}-01`;
        conditions.push(sql`${copilotTicket.processDate} >= ${startDate}`);
        conditions.push(sql`${copilotTicket.processDate} < ${endDate}`);
      }

      if (input?.developer) {
        conditions.push(eq(copilotTicket.developer, input.developer));
      }

      if (input?.project) {
        conditions.push(eq(copilotTicket.project, input.project));
      }

      if (input?.category) {
        conditions.push(eq(copilotTicket.category, input.category));
      }

      if (input?.ticket) {
        conditions.push(
          sql`${copilotTicket.ticketUrl} ILIKE ${`%${input.ticket}%`}`
        );
      }

      const whereCondition =
        conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ count: count() })
        .from(copilotTicket)
        .where(whereCondition);

      const data = await db
        .select()
        .from(copilotTicket)
        .where(whereCondition)
        .orderBy(sql`${copilotTicket.processDate} DESC`)
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
      .select({ fullName: employee.fullName })
      .from(employee)
      .orderBy(employee.fullName);
    return rows.map((r) => r.fullName.split(" ")[0]!);
  }),

  listProjects: protectedProcedure.handler(() => [...CANONICAL_PROJECTS]),

  update: managerProcedure
    .input(z.object({ data: updateCopilotTicketSchema, id: z.string() }))
    .handler(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(copilotTicket)
        .where(eq(copilotTicket.id, input.id));
      if (!existing) {
        throw new ORPCError("NOT_FOUND");
      }

      // Check for duplicate ticket URL if URL is being changed
      if (input.data.ticketUrl && input.data.ticketUrl !== existing.ticketUrl) {
        const [dup] = await db
          .select({ id: copilotTicket.id })
          .from(copilotTicket)
          .where(eq(copilotTicket.ticketUrl, input.data.ticketUrl));
        if (dup) {
          throw new ORPCError("CONFLICT", {
            message: "A ticket with this URL already exists",
          });
        }
      }

      const [updated] = await db
        .update(copilotTicket)
        .set(input.data)
        .where(eq(copilotTicket.id, input.id))
        .returning();

      // Audit log
      await db.insert(copilotAuditLog).values({
        action: "UPDATE_TICKET",
        details: { changes: input.data, ticketId: input.id },
        developer: updated!.developer,
        id: crypto.randomUUID(),
      });

      return updated;
    }),
};
