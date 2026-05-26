import type { AppRouterClient } from "@workspace/api/routers/index";

export type CopilotTicket = Awaited<
  ReturnType<AppRouterClient["copilotEvaluation"]["ticket"]["list"]>
>[number];

export type ChartData = Awaited<
  ReturnType<AppRouterClient["copilotEvaluation"]["ticket"]["chartData"]>
>;

export type EfficiencyData = Awaited<
  ReturnType<AppRouterClient["copilotEvaluation"]["ticket"]["efficiencyData"]>
>;

export type TimesheetMonth = Awaited<
  ReturnType<AppRouterClient["copilotEvaluation"]["timesheet"]["getMonth"]>
>;

export type KpiProductivity = Awaited<
  ReturnType<AppRouterClient["copilotEvaluation"]["kpi"]["listProductivity"]>
>[number];

export type KpiSharing = Awaited<
  ReturnType<AppRouterClient["copilotEvaluation"]["kpi"]["listSharing"]>
>[number];

export type KpiQuality = Awaited<
  ReturnType<AppRouterClient["copilotEvaluation"]["kpi"]["listQuality"]>
>[number];

export type KpiSummary = Awaited<
  ReturnType<AppRouterClient["copilotEvaluation"]["kpi"]["listSummary"]>
>[number];
