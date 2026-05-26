import { copilotTicketRouter } from "./ticket";
import { copilotTimesheetRouter } from "./timesheet";
import { copilotKpiRouter } from "./kpi";
import { copilotJiraRouter } from "./jira";
import { copilotAuditRouter } from "./audit";

export const copilotEvaluationRouter = {
  ticket: copilotTicketRouter,
  timesheet: copilotTimesheetRouter,
  kpi: copilotKpiRouter,
  jira: copilotJiraRouter,
  audit: copilotAuditRouter,
};
