import { copilotAuditRouter } from "./audit";
import { copilotJiraRouter } from "./jira";
import { copilotKpiRouter } from "./kpi";
import { copilotTicketRouter } from "./ticket";
import { copilotTimesheetRouter } from "./timesheet";

export const copilotEvaluationRouter = {
  audit: copilotAuditRouter,
  jira: copilotJiraRouter,
  kpi: copilotKpiRouter,
  ticket: copilotTicketRouter,
  timesheet: copilotTimesheetRouter,
};
