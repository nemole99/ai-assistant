import { db } from "@workspace/db";
import { copilotTicket } from "@workspace/db/schema/copilot-evaluation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { managerProcedure } from "../../index";
import { env } from "@workspace/env/server";

const jiraTicketSchema = z.object({
  developer: z.string(),
  project: z.string(),
  category: z.enum(["bug", "feature"]),
  ticketUrl: z.string().url(),
  processDate: z.string(),
  totalEffort: z.number(),
  investigateActual: z.number(),
  codeFixActual: z.number(),
  codeReviewActual: z.number(),
  comment: z.string().optional(),
});

export const copilotJiraRouter = {
  fetchTickets: managerProcedure.handler(async () => {
    const baseUrl = env.JIRA_BASE_URL;
    const token = env.JIRA_TOKEN;
    const projectKey = env.JIRA_PROJECT;
    const developersMap = env.JIRA_DEVELOPERS;

    if (!baseUrl || !token || !projectKey || !developersMap) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Jira integration is not configured. Set JIRA_BASE_URL, JIRA_TOKEN, JIRA_PROJECT, and JIRA_DEVELOPERS environment variables.",
      });
    }

    // Parse developer mapping: "email1:Name1,email2:Name2"
    const devMap = new Map<string, string>();
    for (const pair of developersMap.split(",")) {
      const [email, name] = pair.trim().split(":");
      if (email && name) devMap.set(email.trim(), name.trim());
    }

    // Fetch open bugs from Jira
    const jql = `project = ${projectKey} AND status != Done AND type = Bug ORDER BY created DESC`;
    const response = await fetch(
      `${baseUrl}/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `Jira API returned ${response.status}: ${response.statusText}`,
      });
    }

    const data = await response.json() as {
      issues: Array<{
        key: string;
        fields: {
          summary: string;
          assignee?: { emailAddress?: string; displayName?: string };
          created: string;
          timeoriginalestimate?: number;
        };
      }>;
    };

    const tickets = data.issues.map((issue) => {
      const assigneeEmail = issue.fields.assignee?.emailAddress ?? "";
      const developer = devMap.get(assigneeEmail) ?? issue.fields.assignee?.displayName ?? "Unassigned";
      const totalEffort = issue.fields.timeoriginalestimate
        ? issue.fields.timeoriginalestimate / 3600
        : 0;

      return {
        developer,
        project: projectKey,
        category: "bug" as const,
        ticketUrl: `${baseUrl}/browse/${issue.key}`,
        processDate: issue.fields.created.split("T")[0],
        totalEffort,
        investigateEstimate: totalEffort * 0.2,
        investigateActual: 0,
        codeFixEstimate: totalEffort * 0.4,
        codeFixActual: 0,
        codeReviewEstimate: totalEffort * 0.15,
        codeReviewActual: 0,
        reopenStatus: 0,
        comment: issue.fields.summary,
      };
    });

    return tickets;
  }),

  submitTickets: managerProcedure
    .input(z.object({ tickets: z.array(jiraTicketSchema) }))
    .handler(async ({ input }) => {
      const results = { imported: 0, errors: [] as string[] };

      for (const ticket of input.tickets) {
        const calculated = {
          ...ticket,
          investigateEstimate: ticket.totalEffort * 0.2,
          codeFixEstimate: ticket.totalEffort * 0.4,
          codeReviewEstimate: ticket.totalEffort * 0.15,
          reopenStatus: 0,
        };

        // Check for duplicate
        const [existing] = await db
          .select({ id: copilotTicket.id })
          .from(copilotTicket)
          .where(eq(copilotTicket.ticketUrl, ticket.ticketUrl));

        if (existing) {
          results.errors.push(`Duplicate: ${ticket.ticketUrl}`);
          continue;
        }

        const id = crypto.randomUUID();
        await db.insert(copilotTicket).values({ id, ...calculated });
        results.imported++;
      }

      return results;
    }),
};
