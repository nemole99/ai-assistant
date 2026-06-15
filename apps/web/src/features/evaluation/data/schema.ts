import type { AppRouterClient } from "@workspace/api/routers/index";

export type EvaluationTicket = Awaited<
  ReturnType<AppRouterClient["evaluation"]["ticket"]["list"]>
>["data"][number];

export type ChartData = Awaited<
  ReturnType<AppRouterClient["evaluation"]["ticket"]["chartData"]>
>;

export type EfficiencyData = Awaited<
  ReturnType<AppRouterClient["evaluation"]["ticket"]["efficiencyData"]>
>;

export type TimesheetMonth = Awaited<
  ReturnType<AppRouterClient["evaluation"]["timesheet"]["getMonth"]>
>;

export type KpiProductivity = Awaited<
  ReturnType<AppRouterClient["evaluation"]["kpi"]["listProductivity"]>
>[number];

export type KpiSharing = Awaited<
  ReturnType<AppRouterClient["evaluation"]["kpi"]["listSharing"]>
>[number];

export type KpiQuality = Awaited<
  ReturnType<AppRouterClient["evaluation"]["kpi"]["listQuality"]>
>[number];

export type KpiSummary = Awaited<
  ReturnType<AppRouterClient["evaluation"]["kpi"]["listSummary"]>
>[number];
