import { evaluationAuditRouter } from "./audit";
import { evaluationJiraSyncRouter } from "./jira-sync";
import { evaluationKpiRouter } from "./kpi";
import { evaluationTicketRouter } from "./ticket";
import { evaluationTimesheetRouter } from "./timesheet";

export const evaluationRouter = {
  audit: evaluationAuditRouter,
  jiraSync: evaluationJiraSyncRouter,
  kpi: evaluationKpiRouter,
  ticket: evaluationTicketRouter,
  timesheet: evaluationTimesheetRouter,
};
