import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { decrypt, encrypt } from "@workspace/db/crypto";
import { employee, project } from "@workspace/db/schema/auth";
import {
  evaluationJiraConfig,
  evaluationTicket,
} from "@workspace/db/schema/evaluation";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../../index";
import {
  assertEmployeeActive,
  resolvePerformedBy,
  writeAudit,
} from "./helpers";

const JIRA_BASE_URL = "https://vts.vatech.com";

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

const PERIOD_TO_JQL: Record<string, string> = {
  last_month:
    "Status was Resolved by currentUser() AND resolved >= startOfMonth(-1M) AND resolved < startOfMonth() ORDER BY resolutiondate DESC",
  last_week:
    "Status was Resolved by currentUser() AND resolved >= startOfWeek(-1w) AND resolved < startOfWeek() ORDER BY resolutiondate DESC",
  this_month:
    "Status was Resolved by currentUser() AND resolved >= startOfMonth() ORDER BY resolutiondate DESC",
  this_week:
    "Status was Resolved by currentUser() AND resolved >= startOfWeek() ORDER BY resolutiondate DESC",
};

async function resolveEmployeeId(userId: string): Promise<string> {
  const [emp] = await db
    .select({ id: employee.id })
    .from(employee)
    .where(eq(employee.userId, userId));
  if (!emp) {
    throw new ORPCError("FORBIDDEN", {
      message:
        "No Employee record is linked to your account. Contact an Admin.",
    });
  }
  return emp.id;
}

export const evaluationJiraSyncRouter = {
  deleteConfig: protectedProcedure.handler(async ({ context }) => {
    await db
      .delete(evaluationJiraConfig)
      .where(eq(evaluationJiraConfig.userId, context.session.user.id));
    return { success: true };
  }),

  fetchTickets: protectedProcedure
    .input(
      z.object({
        period: z.enum(["this_week", "last_week", "this_month", "last_month"]),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const [configRow] = await db
        .select({ encryptedPat: evaluationJiraConfig.encryptedPat })
        .from(evaluationJiraConfig)
        .where(eq(evaluationJiraConfig.userId, userId));
      if (!configRow) {
        throw new ORPCError("FORBIDDEN", {
          message:
            "Jira PAT not configured. Go to Settings → Jira to set it up.",
        });
      }

      const pat = decrypt(configRow.encryptedPat);
      const jql = PERIOD_TO_JQL[input.period]!;

      const response = await fetch(
        `${JIRA_BASE_URL}/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,issuetype,timespent,resolutiondate`,
        {
          headers: {
            Authorization: `Bearer ${pat}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error("[jira-sync] fetch error", response.status, body);
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: `Jira API error: ${response.status} ${response.statusText}`,
        });
      }

      const data = (await response.json()) as {
        total?: number;
        issues: {
          key: string;
          fields: {
            issuetype?: { name?: string };
            resolutiondate?: string | null;
            summary: string;
            timespent?: number | null;
          };
        }[];
      };
      console.log("[jira-sync] JQL:", jql);
      console.log(
        "[jira-sync] total:",
        data.total,
        "issues returned:",
        data.issues?.length
      );

      const allProjects = await db
        .select({ id: project.id, name: project.name })
        .from(project);
      const nameToProjectId = new Map(allProjects.map((p) => [p.name, p.id]));

      const urls = data.issues.map((i) => `${JIRA_BASE_URL}/browse/${i.key}`);
      const existingRows =
        urls.length > 0
          ? await db
              .select({ ticketUrl: evaluationTicket.ticketUrl })
              .from(evaluationTicket)
              .where(inArray(evaluationTicket.ticketUrl, urls))
          : [];
      const existingUrls = new Set(existingRows.map((r) => r.ticketUrl));

      const tickets = data.issues.map((issue) => {
        const ticketUrl = `${JIRA_BASE_URL}/browse/${issue.key}`;
        const totalEffort = issue.fields.timespent
          ? issue.fields.timespent / 3600
          : null;
        const typeName = issue.fields.issuetype?.name ?? "";
        const category =
          typeName.toLowerCase() === "bug"
            ? ("bug" as const)
            : ("feature" as const);

        const prefix = issue.key.match(/^(?<p>[A-Z][A-Z0-9]+)-/)?.groups?.p;
        const projectName = prefix ? PREFIX_TO_PROJECT[prefix] : undefined;
        const projectId = projectName
          ? (nameToProjectId.get(projectName) ?? null)
          : null;

        const processDate = issue.fields.resolutiondate
          ? issue.fields.resolutiondate.split("T")[0]!
          : new Date().toISOString().split("T")[0]!;

        return {
          alreadyAdded: existingUrls.has(ticketUrl),
          category,
          comment: issue.fields.summary,
          processDate,
          projectId,
          projectWarning: !projectId,
          ticketUrl,
          totalEffort,
        };
      });

      return {
        projects: allProjects.map((p) => ({ id: p.id, name: p.name })),
        tickets,
      };
    }),

  getConfig: protectedProcedure.handler(async ({ context }) => {
    const [row] = await db
      .select({ id: evaluationJiraConfig.id })
      .from(evaluationJiraConfig)
      .where(eq(evaluationJiraConfig.userId, context.session.user.id));
    return { configured: !!row };
  }),

  saveConfig: protectedProcedure
    .input(z.object({ pat: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const encryptedPat = encrypt(input.pat);
      await db
        .insert(evaluationJiraConfig)
        .values({ encryptedPat, id: crypto.randomUUID(), userId })
        .onConflictDoUpdate({
          set: { encryptedPat, updatedAt: new Date() },
          target: evaluationJiraConfig.userId,
        });
      return { success: true };
    }),

  submitTickets: protectedProcedure
    .input(
      z.object({
        tickets: z.array(
          z.object({
            category: z.enum(["bug", "feature"]),
            comment: z.string().optional(),
            processDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            projectId: z.string().min(1),
            ticketUrl: z.string().url(),
            totalEffort: z.number().positive().nullable().optional(),
          })
        ),
      })
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const employeeId = await resolveEmployeeId(userId);
      await assertEmployeeActive(employeeId);
      const performedBy = await resolvePerformedBy(userId);

      const results = { errors: [] as string[], imported: 0, skipped: 0 };

      for (const ticket of input.tickets) {
        // oxlint-disable-next-line no-await-in-loop
        const [dup] = await db
          .select({ id: evaluationTicket.id })
          .from(evaluationTicket)
          .where(eq(evaluationTicket.ticketUrl, ticket.ticketUrl));
        if (dup) {
          results.skipped++;
          continue;
        }

        const id = crypto.randomUUID();
        // oxlint-disable-next-line no-await-in-loop
        await db.insert(evaluationTicket).values({
          category: ticket.category,
          codeFixActual: 0,
          codeFixEstimate: 0,
          codeReviewActual: 0,
          codeReviewEstimate: 0,
          comment: ticket.comment,
          employeeId,
          id,
          investigateActual: 0,
          investigateEstimate: 0,
          processDate: ticket.processDate,
          projectId: ticket.projectId,
          reopenStatus: 0,
          ticketUrl: ticket.ticketUrl,
          totalEffort: ticket.totalEffort ?? null,
        });

        // oxlint-disable-next-line no-await-in-loop
        await writeAudit({
          action: "IMPORT_TICKET",
          details: {
            source: "jira-sync",
            ticketId: id,
            ticketUrl: ticket.ticketUrl,
          },
          employeeId,
          performedBy,
        });

        results.imported++;
      }

      return results;
    }),
};
