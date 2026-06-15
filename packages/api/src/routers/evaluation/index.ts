import { evaluationAuditRouter } from "./audit";
import { evaluationJiraRouter } from "./jira";
import { evaluationKpiRouter } from "./kpi";
import { evaluationTicketRouter } from "./ticket";
import { evaluationTimesheetRouter } from "./timesheet";

export const evaluationRouter = {
  audit: evaluationAuditRouter,
  jira: evaluationJiraRouter,
  kpi: evaluationKpiRouter,
  ticket: evaluationTicketRouter,
  timesheet: evaluationTimesheetRouter,
};
