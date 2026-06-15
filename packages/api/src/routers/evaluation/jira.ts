import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { employee, project } from "@workspace/db/schema/auth";
import { evaluationTicket } from "@workspace/db/schema/evaluation";
import { env } from "@workspace/env/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { managerProcedure } from "../../index";
import {
  assertEmployeeActive,
  resolvePerformedBy,
  writeAudit,
} from "./helpers";

/** Ticket prefix → project name (unambiguous only) */
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

export const evaluationJiraRouter = {
  fetchTickets: managerProcedure.handler(async () => {
    const baseUrl = env.JIRA_BASE_URL;
    const token = env.JIRA_TOKEN;
    const projectKey = env.JIRA_PROJECT;

    if (!baseUrl || !token || !projectKey) {
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Jira integration is not configured. Set JIRA_BASE_URL, JIRA_TOKEN, and JIRA_PROJECT.",
      });
    }

    // Build email → employeeId map from DB
    const employees = await db
      .select({ email: employee.email, id: employee.id })
      .from(employee);
    const emailToEmployeeId = new Map(employees.map((e) => [e.email, e.id]));

    // Build project name → projectId map
    const projects = await db
      .select({ id: project.id, name: project.name })
      .from(project);
    const nameToProjectId = new Map(projects.map((p) => [p.name, p.id]));

    const jql = `project = ${projectKey} AND status != Done AND type = Bug ORDER BY created DESC`;
    const response = await fetch(
      `${baseUrl}/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `Jira API returned ${response.status}: ${response.statusText}`,
      });
    }

    const data = (await response.json()) as {
      issues: {
        key: string;
        fields: {
          summary: string;
          assignee?: { emailAddress?: string; displayName?: string };
          created: string;
          timeoriginalestimate?: number;
        };
      }[];
    };

    const tickets = data.issues.map((issue) => {
      const assigneeEmail = issue.fields.assignee?.emailAddress ?? "";
      const employeeId = emailToEmployeeId.get(assigneeEmail) ?? null;
      const warning = !employeeId;

      const totalEffort = issue.fields.timeoriginalestimate
        ? issue.fields.timeoriginalestimate / 3600
        : 0;

      const ticketUrl = `${baseUrl}/browse/${issue.key}`;
      const prefix = issue.key.match(/^(?<prefix>[A-Z][A-Z0-9]+)-/)?.groups
        ?.prefix;
      const projectName = prefix
        ? (PREFIX_TO_PROJECT[prefix] ?? projectKey)
        : projectKey;
      const projectId = nameToProjectId.get(projectName) ?? null;

      return {
        assigneeDisplayName: issue.fields.assignee?.displayName ?? null,
        assigneeEmail,
        category: "bug" as const,
        codeFixActual: 0,
        codeFixEstimate: totalEffort * 0.4,
        codeReviewActual: 0,
        codeReviewEstimate: totalEffort * 0.15,
        comment: issue.fields.summary,
        employeeId,
        investigateActual: 0,
        investigateEstimate: totalEffort * 0.2,
        processDate: issue.fields.created.split("T")[0]!,
        projectId,
        reopenStatus: 0,
        ticketUrl,
        totalEffort: totalEffort > 0 ? totalEffort : null,
        warning,
      };
    });

    return tickets;
  }),

  submitTickets: managerProcedure
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
            employeeId: z.string().min(1).nullable(),
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
      const results = { errors: [] as string[], imported: 0, skipped: 0 };
      const performedBy = await resolvePerformedBy(context.session.user.id);

      // oxlint-disable-next-line no-await-in-loop
      for (const ticket of input.tickets) {
        if (!ticket.employeeId) {
          results.skipped++;
          continue;
        }

        try {
          // oxlint-disable-next-line no-await-in-loop
          await assertEmployeeActive(ticket.employeeId);
        } catch {
          results.errors.push(
            `Employee ${ticket.employeeId} is not ACTIVE: ${ticket.ticketUrl}`
          );
          continue;
        }

        // oxlint-disable-next-line no-await-in-loop
        const [dup] = await db
          .select({ id: evaluationTicket.id })
          .from(evaluationTicket)
          .where(eq(evaluationTicket.ticketUrl, ticket.ticketUrl));
        if (dup) {
          results.errors.push(`Duplicate: ${ticket.ticketUrl}`);
          continue;
        }

        const id = crypto.randomUUID();
        // oxlint-disable-next-line no-await-in-loop
        await db.insert(evaluationTicket).values({
          id,
          ...ticket,
          employeeId: ticket.employeeId,
        });

        // oxlint-disable-next-line no-await-in-loop
        await writeAudit({
          action: "IMPORT_TICKET",
          details: {
            source: "jira",
            ticketId: id,
            ticketUrl: ticket.ticketUrl,
          },
          employeeId: ticket.employeeId,
          performedBy,
        });

        results.imported++;
      }

      return results;
    }),
};
