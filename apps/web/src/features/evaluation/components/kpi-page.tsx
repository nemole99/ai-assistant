import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";
import { useState, useMemo, useCallback } from "react";

import { Loader } from "@/components/loader";
import { MonthPicker } from "@/components/month-picker";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

import {
  useKpiProductivity,
  useKpiSharing,
  useKpiQuality,
  useKpiSummary,
  useUpdateKpiSharingMonth,
  useUpdateKpiQualityMonth,
  useUpdateKpiSummaryComment,
} from "../hooks/use-kpi";
import { useMonthWithDefault } from "../hooks/use-month";
import { useChartData, useLatestTicketMonth } from "../hooks/use-tickets";
import { useTour } from "../hooks/use-tour";
import { KpiTour } from "./evaluation-tour";

/** Generate YYYY-MM keys for all 12 months of a given year */
function yearMonthKeys(year: number): string[] {
  return Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`
  );
}

function shortMonthLabel(ym: string): string {
  const [, m] = ym.split("-");
  return new Date(2000, Number(m) - 1, 1).toLocaleString("en", {
    month: "short",
  });
}

/** Table cell class with a highlight when the column matches the active month */
function monthColClass(ym: string, activeMonth: string, base: string): string {
  return cn(base, ym === activeMonth && "bg-primary/10 font-bold");
}

/** Current real month as YYYY-MM — the only editable quality month (legacy parity) */
function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Color of the Re-open (number) cell, ported from the legacy web:
 * ratio = reopenNumber / (totalByMar + result) compared against the re-open %.
 */
function reopenCellColor(
  reopenNumber: number | null,
  totalByMar: number | null,
  result: number | null,
  reopenPercent: number | null
): string {
  if (reopenNumber === null || reopenNumber === 0) {
    return "";
  }
  const denom = (totalByMar ?? 0) + (result ?? 0);
  if (denom <= 0 || reopenPercent === null || reopenPercent <= 0) {
    return "";
  }
  const ratio = reopenNumber / denom;
  if (ratio <= reopenPercent) {
    return "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400";
  }
  if (ratio <= reopenPercent * 1.25) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
  }
  if (ratio <= reopenPercent * 1.5) {
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400";
  }
  return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
}

/** Background + text color based on value / target ratio */
function kpiCellColor(
  value: number | null | undefined,
  target: number | null | undefined
): string {
  if (value === null || value === undefined || !target) {
    return "";
  }
  const ratio = value / target;
  if (ratio >= 1) {
    return "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400";
  }
  if (ratio >= 0.8) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
  }
  if (ratio >= 0.6) {
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400";
  }
  return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
}

function computeTicketStats(
  rows: { count: number; fullName: string | null }[]
) {
  const totalTickets = rows.reduce((s, r) => s + r.count, 0);
  const devCount = rows.length;
  const maxEntry = [...rows].toSorted((a, b) => b.count - a.count)[0];
  const avgPerDev = devCount > 0 ? totalTickets / devCount : 0;
  return {
    avgPerDev,
    devCount,
    maxCount: maxEntry?.count ?? 0,
    maxDev: maxEntry?.fullName ?? "-",
    totalTickets,
  };
}

export function EvaluationKpi() {
  // Default to the latest month that has data; fall back to the current month.
  const { data: session } = authClient.useSession();
  const isEmployee = session?.user?.role === "EMPLOYEE";
  const { data: selfEmployee } = useQuery(orpc.employee.getSelf.queryOptions());

  const { data: latest } = useLatestTicketMonth();
  const [month, setMonthOverride] = useMonthWithDefault(latest?.month);
  const [activeTab, setActiveTab] = useState("summary");
  const { open, setOpen } = useTour("kpi");
  const handleSwitchTab = useCallback((tab: string) => setActiveTab(tab), []);

  const year = Number(month.split("-")[0]);
  const monthKeys = useMemo(() => yearMonthKeys(year), [year]);

  const { data: chartResult } = useChartData(month);
  const { data: productivity, isLoading: prodLoading } = useKpiProductivity();
  const { data: sharing, isLoading: sharingLoading } = useKpiSharing();
  const { data: quality, isLoading: qualityLoading } = useKpiQuality();
  const { data: summary, isLoading: summaryLoading } = useKpiSummary();
  const updateSharingMonth = useUpdateKpiSharingMonth();
  const updateQualityMonth = useUpdateKpiQualityMonth();
  const updateSummaryComment = useUpdateKpiSummaryComment();

  const isLoading =
    prodLoading || sharingLoading || qualityLoading || summaryLoading;

  const stats = useMemo(
    () => computeTicketStats(chartResult?.data ?? []),
    [chartResult]
  );

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">KPI Dashboard</h2>
          <p className="text-muted-foreground">
            Manage productivity, sharing, quality, and summary KPIs.
          </p>
        </div>
        <MonthPicker value={month} onChange={setMonthOverride} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-tour="kpi-tabs">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="sharing" data-tour="kpi-sharing-tab">
            Sharing
          </TabsTrigger>
          <TabsTrigger value="quality" data-tour="kpi-quality-tab">
            Quality
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-4">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
                  Tổng Ticket
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {stats.totalTickets}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tháng {month.split("-")[1]}/{month.split("-")[0]}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
                  Số Developer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {stats.devCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  tham gia trong tháng
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
                  Nhiều nhất
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {stats.maxCount}
                </div>
                <p className="text-xs text-muted-foreground">{stats.maxDev}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
                  TB Ticket / Người
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {stats.avgPerDev.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">
                  ticket / developer
                </p>
              </CardContent>
            </Card>
          </div>
          <SummaryKpiTable
            rows={summary ?? []}
            onSaveComment={(employeeId, projectId, comment) =>
              updateSummaryComment.mutate({ comment, employeeId, projectId })
            }
          />
        </TabsContent>

        <TabsContent value="productivity" className="mt-4">
          <CardTitle>
            Productivity KPI — {(productivity ?? []).length} developers
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Target: ticket/ngày · Màu: ≥100% xanh lá, ≥80% xanh dương, ≥60%
            vàng, &lt;60% đỏ
          </p>
          <Table className="mt-8">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>Developer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-center">Target</TableHead>
                {monthKeys.map((ym) => (
                  <TableHead
                    key={ym}
                    className={monthColClass(
                      ym,
                      month,
                      "text-center capitalize min-w-12"
                    )}
                  >
                    {shortMonthLabel(ym)}
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-14 font-semibold">
                  AVG
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(productivity ?? []).map((row, idx) => {
                const mv = (row.monthlyValues as Record<string, number>) ?? {};
                const monthValues = monthKeys
                  .map((k) => mv[k])
                  .filter((v): v is number => v !== undefined);
                const avg =
                  monthValues.length > 0
                    ? monthValues.reduce((s, v) => s + v, 0) /
                      monthValues.length
                    : null;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-center text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.fullName ?? row.employeeId}
                    </TableCell>
                    <TableCell>{row.projectName ?? row.projectId}</TableCell>
                    <TableCell>{row.title ?? "-"}</TableCell>
                    <TableCell className="text-center">
                      {row.target?.toFixed(2) ?? "-"}
                    </TableCell>
                    {monthKeys.map((ym) => {
                      const val = mv[ym];
                      return (
                        <TableCell
                          key={ym}
                          className={monthColClass(
                            ym,
                            month,
                            cn("text-center", kpiCellColor(val, row.target))
                          )}
                        >
                          {val ?? "-"}
                        </TableCell>
                      );
                    })}
                    <TableCell
                      className={cn(
                        "text-center font-medium",
                        kpiCellColor(avg, row.target)
                      )}
                    >
                      {avg === null ? "-" : avg.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(productivity ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5 + monthKeys.length + 1}
                    className="text-center text-muted-foreground py-8"
                  >
                    No productivity KPI data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="sharing" className="mt-4">
          <SharingKpiTable
            activeMonth={month}
            isEmployee={isEmployee}
            selfEmployeeId={selfEmployee?.id}
            monthKeys={monthKeys}
            onSaveMonth={(id, ym, value) =>
              updateSharingMonth.mutate({ id, month: ym, value })
            }
            rows={sharing ?? []}
          />
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <QualityKpiTable
            activeMonth={month}
            isEmployee={isEmployee}
            selfEmployeeId={selfEmployee?.id}
            monthKeys={monthKeys}
            onSaveMonth={(id, ym, value) =>
              updateQualityMonth.mutate({ id, month: ym, value })
            }
            rows={quality ?? []}
          />
        </TabsContent>
      </Tabs>
      <KpiTour
        open={open}
        onOpenChange={setOpen}
        onSwitchTab={handleSwitchTab}
      />
    </>
  );
}

// --- Helper components ---

function SummaryKpiTable({
  rows,
  onSaveComment,
}: {
  rows: {
    id: string;
    employeeId: string;
    projectId: string;
    fullName: string | null;
    projectName: string | null;
    title: string | null;
    targetProductivity: number | null;
    targetReopen: number | null;
    targetSharing: number | null;
    resultProductivity: number | null;
    resultReopen: number | null;
    resultSharing: number | null;
    comment: string | null;
  }[];
  onSaveComment: (
    employeeId: string,
    projectId: string,
    comment: string
  ) => void;
}) {
  return (
    <>
      <CardTitle>Summary KPI — {rows.length} developers</CardTitle>
      <p className="text-sm text-muted-foreground">
        Tổng hợp Productivity · Quality · Sharing KPI
      </p>
      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th
              rowSpan={2}
              className="border p-2 text-center bg-indigo-900 text-white font-medium w-10"
            >
              #
            </th>
            <th
              rowSpan={2}
              className="border p-2 text-left bg-indigo-900 text-white font-medium"
            >
              Developer
            </th>
            <th
              rowSpan={2}
              className="border p-2 text-left bg-indigo-900 text-white font-medium"
            >
              Project
            </th>
            <th
              rowSpan={2}
              className="border p-2 text-left bg-indigo-900 text-white font-medium"
            >
              Title
            </th>
            <th
              colSpan={3}
              className="border p-2 text-center bg-teal-600 text-white font-medium"
            >
              Target
            </th>
            <th
              colSpan={3}
              className="border p-2 text-center bg-blue-600 text-white font-medium"
            >
              Result
            </th>
            <th
              rowSpan={2}
              className="border p-2 text-left bg-indigo-900 text-white font-medium min-w-40"
            >
              Comment
            </th>
          </tr>
          <tr>
            <th className="border p-2 text-center bg-teal-600 text-white text-xs font-medium">
              Productivity (ticket/day)
            </th>
            <th className="border p-2 text-center bg-teal-600 text-white text-xs font-medium">
              Re-open (number of bug)
            </th>
            <th className="border p-2 text-center bg-teal-600 text-white text-xs font-medium">
              Sharing (hours/year)
            </th>
            <th className="border p-2 text-center bg-blue-600 text-white text-xs font-medium">
              Productivity (ticket/day)
            </th>
            <th className="border p-2 text-center bg-blue-600 text-white text-xs font-medium">
              Re-open (number of bug)
            </th>
            <th className="border p-2 text-center bg-blue-600 text-white text-xs font-medium">
              Sharing (hours/year)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const prodBelow =
              row.resultProductivity !== null &&
              row.targetProductivity !== null &&
              row.resultProductivity < row.targetProductivity;
            return (
              <tr key={row.id} className="hover:bg-muted/50">
                <td className="border p-2 text-center text-muted-foreground">
                  {idx + 1}
                </td>
                <td className="border p-2 font-medium">
                  {row.fullName ?? row.employeeId}
                </td>
                <td className="border p-2">
                  {row.projectName ?? row.projectId}
                </td>
                <td className="border p-2">{row.title ?? "-"}</td>
                <td className="border p-2 text-center bg-green-50 dark:bg-green-950/30">
                  {row.targetProductivity?.toFixed(2) ?? "-"}
                </td>
                <td className="border p-2 text-center bg-green-50 dark:bg-green-950/30">
                  {row.targetReopen ?? "-"}
                </td>
                <td className="border p-2 text-center bg-green-50 dark:bg-green-950/30">
                  {row.targetSharing?.toFixed(2) ?? "-"}
                </td>
                <td
                  className={cn(
                    "border p-2 text-center bg-blue-50 dark:bg-blue-950/30",
                    prodBelow &&
                      "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                  )}
                >
                  {row.resultProductivity?.toFixed(2) ?? "-"}
                </td>
                <td className="border p-2 text-center bg-blue-50 dark:bg-blue-950/30">
                  {row.resultReopen ?? "-"}
                </td>
                <td
                  className={cn(
                    "border p-2 text-center",
                    (row.resultSharing ?? 0) > 0
                      ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400"
                      : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                  )}
                >
                  {row.resultSharing?.toFixed(2) ?? "0.00"}
                </td>
                <td className="border p-2 text-sm italic text-muted-foreground">
                  <EditableTextCell
                    value={row.comment ?? ""}
                    onSave={(comment) =>
                      onSaveComment(row.employeeId, row.projectId, comment)
                    }
                  />
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={11}
                className="border p-8 text-center text-muted-foreground"
              >
                No summary KPI data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}

interface SharingKpiRow {
  id: string;
  employeeId: string;
  projectId: string;
  fullName: string | null;
  projectName: string | null;
  target: number | null;
  result: number | null;
  monthlyValues: unknown;
}

function SharingKpiTable({
  activeMonth,
  isEmployee,
  selfEmployeeId,
  monthKeys,
  onSaveMonth,
  rows,
}: {
  activeMonth: string;
  isEmployee: boolean;
  selfEmployeeId: string | undefined;
  monthKeys: string[];
  onSaveMonth: (id: string, month: string, value: number) => void;
  rows: SharingKpiRow[];
}) {
  const editableMonth = currentYearMonth();
  return (
    <>
      <CardTitle>Sharing KPI</CardTitle>
      <p className="text-sm text-muted-foreground">
        Editable: {shortMonthLabel(editableMonth)}
      </p>
      <Table className="mt-8" data-tour="kpi-sharing-cells">
        <TableHeader>
          <TableRow>
            <TableHead>Developer</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Target (h/yr)</TableHead>
            <TableHead>Result (h)</TableHead>
            {monthKeys.map((ym) => (
              <TableHead
                key={ym}
                className={monthColClass(
                  ym,
                  activeMonth,
                  "text-center capitalize min-w-12"
                )}
              >
                {shortMonthLabel(ym)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const mv = (row.monthlyValues as Record<string, number>) ?? {};
            const isOtherRow = isEmployee && selfEmployeeId !== row.employeeId;
            return (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  {row.fullName ?? row.employeeId}
                </TableCell>
                <TableCell>{row.projectName ?? row.projectId}</TableCell>
                <TableCell>{row.target ?? "-"}</TableCell>
                <TableCell>{row.result ?? "-"}</TableCell>
                {monthKeys.map((ym) => {
                  const val = mv[ym];
                  return (
                    <TableCell
                      key={ym}
                      className={monthColClass(ym, activeMonth, "text-center")}
                    >
                      {ym === editableMonth ? (
                        <EditableCell
                          disabled={isOtherRow}
                          value={val}
                          onSave={(value) => onSaveMonth(row.id, ym, value)}
                        />
                      ) : (
                        <span>{val === undefined ? "-" : val}</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4 + monthKeys.length}
                className="text-center text-muted-foreground py-8"
              >
                No sharing KPI data
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}

interface QualityKpiRow {
  id: string;
  employeeId: string;
  projectId: string;
  fullName: string | null;
  projectName: string | null;
  title: string | null;
  reopenPercent: number | null;
  reopenNumber: number | null;
  result: number | null;
  totalByMar: number | null;
  monthlyValues: unknown;
}

/** Quality KPI table — column layout and colors mirror the legacy web app */
function QualityKpiTable({
  activeMonth,
  isEmployee,
  selfEmployeeId,
  monthKeys,
  onSaveMonth,
  rows,
}: {
  activeMonth: string;
  isEmployee: boolean;
  selfEmployeeId: string | undefined;
  monthKeys: string[];
  onSaveMonth: (id: string, month: string, value: number) => void;
  rows: QualityKpiRow[];
}) {
  const editableMonth = currentYearMonth();
  return (
    <>
      <CardTitle>Quality KPI — {rows.length} developers</CardTitle>
      <p className="text-sm text-muted-foreground">
        Re-open bug counts · Editable: {shortMonthLabel(editableMonth)} · Màu
        (Re-open number): xanh lá = trong ngân sách, đỏ = vượt quá
      </p>
      <Table className="mt-8" data-tour="kpi-quality-cells">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 text-center">#</TableHead>
            <TableHead>Developer</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="text-center">Re-open (%)</TableHead>
            <TableHead className="text-center">Re-open (number)</TableHead>
            <TableHead className="text-center">Result (number)</TableHead>
            {monthKeys.map((ym) => (
              <TableHead
                key={ym}
                className={monthColClass(
                  ym,
                  activeMonth,
                  "text-center capitalize min-w-12"
                )}
              >
                {shortMonthLabel(ym)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => {
            const mv = (row.monthlyValues as Record<string, number>) ?? {};
            const isOtherRow = isEmployee && selfEmployeeId !== row.employeeId;
            return (
              <TableRow key={row.id}>
                <TableCell className="text-center text-muted-foreground">
                  {idx + 1}
                </TableCell>
                <TableCell className="font-medium">
                  {row.fullName ?? row.employeeId}
                </TableCell>
                <TableCell>{row.projectName ?? row.projectId}</TableCell>
                <TableCell>{row.title ?? "-"}</TableCell>
                <TableCell className="text-center">
                  {row.reopenPercent === null
                    ? "–"
                    : `${Math.round(row.reopenPercent * 100)}%`}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-center",
                    reopenCellColor(
                      row.reopenNumber,
                      row.totalByMar,
                      row.result,
                      row.reopenPercent
                    )
                  )}
                >
                  {row.reopenNumber ?? "–"}
                </TableCell>
                <TableCell className="text-center">
                  {row.result ?? "–"}
                </TableCell>
                {monthKeys.map((ym) => {
                  const val = mv[ym];
                  return (
                    <TableCell
                      key={ym}
                      className={monthColClass(ym, activeMonth, "text-center")}
                    >
                      {ym === editableMonth ? (
                        <EditableCell
                          disabled={isOtherRow}
                          value={val}
                          onSave={(value) => onSaveMonth(row.id, ym, value)}
                        />
                      ) : (
                        <span>{val === undefined ? "–" : Math.round(val)}</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7 + monthKeys.length}
                className="text-center text-muted-foreground py-8"
              >
                No quality KPI data
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}

function EditableCell({
  disabled,
  value,
  onSave,
}: {
  disabled?: boolean;
  value?: number;
  onSave: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value ?? ""));

  if (!editing) {
    return (
      <button
        type="button"
        className={cn(
          "min-w-6 inline-block",
          disabled
            ? "cursor-not-allowed text-muted-foreground"
            : "cursor-pointer hover:underline"
        )}
        disabled={disabled}
        onClick={() => {
          if (disabled) {
            return;
          }
          setLocalValue(String(value ?? ""));
          setEditing(true);
        }}
      >
        {value ?? "-"}
      </button>
    );
  }

  return (
    <Input
      type="number"
      className="w-16 h-6 text-xs"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        const num = Number(localValue);
        if (!Number.isNaN(num) && localValue !== "") {
          onSave(num);
        }
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === "Escape") {
          setEditing(false);
        }
      }}
      autoFocus
    />
  );
}

function EditableTextCell({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  if (!editing) {
    return (
      <button
        type="button"
        className="cursor-pointer hover:underline min-w-12 inline-block"
        onClick={() => {
          setLocalValue(value);
          setEditing(true);
        }}
      >
        {value || "-"}
      </button>
    );
  }

  return (
    <Input
      className="w-32 h-6 text-xs"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        onSave(localValue);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === "Escape") {
          setEditing(false);
        }
      }}
      autoFocus
    />
  );
}
