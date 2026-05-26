import { useState, useMemo } from "react";
import { ContentLayout } from "@/components/layout/content-layout";
import { Loader } from "@/components/loader";
import { Input } from "@workspace/ui/components/input";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
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
import { useTickets } from "../hooks/use-tickets";
import {
  useKpiProductivity,
  useKpiSharing,
  useKpiQuality,
  useKpiSummary,
  useUpdateKpiSharingMonth,
  useUpdateKpiQualityMonth,
  useUpdateKpiSummaryComment,
} from "../hooks/use-kpi";
import type { KpiProductivity, KpiSharing, KpiQuality, KpiSummary } from "../data/schema";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function getMonthKey(monthStr: string): string {
  const [, m] = monthStr.split("-").map(Number);
  return MONTHS[m - 1] ?? "";
}

export function CopilotEvaluationKpi() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const { data: ticketResult } = useTickets({ month, limit: 100 });
  const tickets = ticketResult?.data ?? [];
  const { data: productivity, isLoading: prodLoading } = useKpiProductivity();
  const { data: sharing, isLoading: sharingLoading } = useKpiSharing();
  const { data: quality, isLoading: qualityLoading } = useKpiQuality();
  const { data: summary, isLoading: summaryLoading } = useKpiSummary();
  const updateSharingMonth = useUpdateKpiSharingMonth();
  const updateQualityMonth = useUpdateKpiQualityMonth();
  const updateSummaryComment = useUpdateKpiSummaryComment();

  const isLoading = prodLoading || sharingLoading || qualityLoading || summaryLoading;

  // Stats for selected month
  const stats = useMemo(() => {
    const totalTickets = tickets.length;
    const developers = new Set(tickets.map((t) => t.developer));
    const devCount = developers.size;
    const devTicketCounts = tickets.reduce((acc, t) => {
      acc[t.developer] = (acc[t.developer] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const maxDev = Object.entries(devTicketCounts).sort(([, a], [, b]) => b - a)[0];
    const avgPerDev = devCount > 0 ? totalTickets / devCount : 0;
    return {
      totalTickets,
      devCount,
      maxCount: maxDev?.[1] ?? 0,
      maxDev: maxDev?.[0] ?? "-",
      avgPerDev,
    };
  }, [tickets]);

  // Selected month key for filtering monthly values
  const selectedMonthKey = getMonthKey(month);

  if (isLoading) {
    return (
      <ContentLayout>
        <Loader />
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">KPI Dashboard</h2>
          <p className="text-muted-foreground">Manage productivity, sharing, quality, and summary KPIs.</p>
        </div>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-40"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Tổng Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalTickets}</div>
            <p className="text-xs text-muted-foreground">Tháng {month.split("-")[1]}/{month.split("-")[0]}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Số Developer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.devCount}</div>
            <p className="text-xs text-muted-foreground">tham gia trong tháng</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Nhiều nhất</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.maxCount}</div>
            <p className="text-xs text-muted-foreground">{stats.maxDev}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">TB Ticket / Người</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.avgPerDev.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">ticket / developer</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="sharing">Sharing</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>

        {/* Summary Tab — matching the design */}
        <TabsContent value="summary" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary KPI — {summary?.length ?? 0} developers</CardTitle>
              <p className="text-sm text-muted-foreground">Tổng hợp Productivity · Quality · Sharing KPI</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th rowSpan={2} className="border p-2 text-center bg-indigo-900 text-white font-medium w-10">#</th>
                    <th rowSpan={2} className="border p-2 text-left bg-indigo-900 text-white font-medium">Developer</th>
                    <th rowSpan={2} className="border p-2 text-left bg-indigo-900 text-white font-medium">Project</th>
                    <th rowSpan={2} className="border p-2 text-left bg-indigo-900 text-white font-medium">Title</th>
                    <th colSpan={3} className="border p-2 text-center bg-teal-600 text-white font-medium">Target</th>
                    <th colSpan={3} className="border p-2 text-center bg-blue-600 text-white font-medium">Result</th>
                    <th rowSpan={2} className="border p-2 text-left bg-indigo-900 text-white font-medium min-w-40">Comment</th>
                  </tr>
                  <tr>
                    <th className="border p-2 text-center bg-teal-600 text-white text-xs font-medium">Productivity (ticket/day)</th>
                    <th className="border p-2 text-center bg-teal-600 text-white text-xs font-medium">Re-open (number of bug)</th>
                    <th className="border p-2 text-center bg-teal-600 text-white text-xs font-medium">Sharing (hours/year)</th>
                    <th className="border p-2 text-center bg-blue-600 text-white text-xs font-medium">Productivity (ticket/day)</th>
                    <th className="border p-2 text-center bg-blue-600 text-white text-xs font-medium">Re-open (number of bug)</th>
                    <th className="border p-2 text-center bg-blue-600 text-white text-xs font-medium">Sharing (hours/year)</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary ?? []).map((row, idx) => {
                    const prodBelow = row.resultProductivity != null && row.targetProductivity != null && row.resultProductivity < row.targetProductivity;
                    return (
                      <tr key={row.id} className="hover:bg-muted/50">
                        <td className="border p-2 text-center text-muted-foreground">{idx + 1}</td>
                        <td className="border p-2 font-medium">{row.developer}</td>
                        <td className="border p-2">{row.project}</td>
                        <td className="border p-2">{row.title ?? "-"}</td>
                        {/* Targets */}
                        <td className="border p-2 text-center bg-green-50 dark:bg-green-950/30">{row.targetProductivity?.toFixed(2) ?? "-"}</td>
                        <td className="border p-2 text-center bg-green-50 dark:bg-green-950/30">{row.targetReopen ?? "-"}</td>
                        <td className="border p-2 text-center bg-green-50 dark:bg-green-950/30">{row.targetSharing?.toFixed(2) ?? "-"}</td>
                        {/* Results */}
                        <td className={cn(
                          "border p-2 text-center bg-blue-50 dark:bg-blue-950/30",
                          prodBelow && "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400",
                        )}>
                          {row.resultProductivity?.toFixed(2) ?? "-"}
                        </td>
                        <td className="border p-2 text-center bg-blue-50 dark:bg-blue-950/30">{row.resultReopen ?? "-"}</td>
                        <td className={cn(
                          "border p-2 text-center",
                          (row.resultSharing ?? 0) > 0 ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400",
                        )}>
                          {row.resultSharing?.toFixed(2) ?? "0.00"}
                        </td>
                        {/* Comment */}
                        <td className="border p-2 text-sm italic text-muted-foreground">
                          <EditableTextCell
                            value={row.comment ?? ""}
                            onSave={(comment) => updateSummaryComment.mutate({ id: row.id, comment })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {(summary ?? []).length === 0 && (
                    <tr>
                      <td colSpan={11} className="border p-8 text-center text-muted-foreground">
                        No summary KPI data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="productivity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Productivity KPI</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Developer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Result</TableHead>
                    {MONTHS.map((m) => (
                      <TableHead key={m} className={cn("text-center capitalize", m === selectedMonthKey && "bg-primary/10 font-bold")}>{m}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(productivity ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.developer}</TableCell>
                      <TableCell>{row.project}</TableCell>
                      <TableCell>{row.target?.toFixed(2) ?? "-"}</TableCell>
                      <TableCell>{row.result?.toFixed(2) ?? "-"}</TableCell>
                      {MONTHS.map((m) => (
                        <TableCell key={m} className={cn("text-center", m === selectedMonthKey && "bg-primary/10 font-bold")}>
                          {(row.monthlyValues as Record<string, number>)?.[m] ?? "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {(productivity ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4 + MONTHS.length} className="text-center text-muted-foreground py-8">
                        No productivity KPI data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sharing" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sharing KPI</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Developer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Target (h/yr)</TableHead>
                    <TableHead>Result (h)</TableHead>
                    {MONTHS.map((m) => (
                      <TableHead key={m} className={cn("text-center capitalize", m === selectedMonthKey && "bg-primary/10 font-bold")}>{m}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(sharing ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.developer}</TableCell>
                      <TableCell>{row.project}</TableCell>
                      <TableCell>{row.target ?? "-"}</TableCell>
                      <TableCell>{row.result ?? "-"}</TableCell>
                      {MONTHS.map((m) => (
                        <TableCell key={m} className={cn("text-center", m === selectedMonthKey && "bg-primary/10 font-bold")}>
                          <EditableCell
                            value={(row.monthlyValues as Record<string, number>)?.[m]}
                            onSave={(value) => updateSharingMonth.mutate({ id: row.id, month: m, value })}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {(sharing ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4 + MONTHS.length} className="text-center text-muted-foreground py-8">
                        No sharing KPI data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality KPI</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Developer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Re-open %</TableHead>
                    <TableHead>Total by Mar</TableHead>
                    <TableHead>Result</TableHead>
                    {MONTHS.map((m) => (
                      <TableHead key={m} className={cn("text-center capitalize", m === selectedMonthKey && "bg-primary/10 font-bold")}>{m}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(quality ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.developer}</TableCell>
                      <TableCell>{row.project}</TableCell>
                      <TableCell>{row.reopenPercent ?? "-"}</TableCell>
                      <TableCell>{row.totalByMar ?? "-"}</TableCell>
                      <TableCell>{row.result ?? "-"}</TableCell>
                      {MONTHS.map((m) => (
                        <TableCell key={m} className={cn("text-center", m === selectedMonthKey && "bg-primary/10 font-bold")}>
                          <EditableCell
                            value={(row.monthlyValues as Record<string, number>)?.[m]}
                            onSave={(value) => updateQualityMonth.mutate({ id: row.id, month: m, value })}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {(quality ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5 + MONTHS.length} className="text-center text-muted-foreground py-8">
                        No quality KPI data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ContentLayout>
  );
}

// --- Helper components ---

function EditableCell({ value, onSave }: { value?: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value ?? ""));

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:underline min-w-6 inline-block"
        onClick={() => {
          setLocalValue(String(value ?? ""));
          setEditing(true);
        }}
      >
        {value ?? "-"}
      </span>
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
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setEditing(false);
      }}
      autoFocus
    />
  );
}

function EditableTextCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  if (!editing) {
    return (
      <span
        className="cursor-pointer hover:underline min-w-12 inline-block"
        onClick={() => {
          setLocalValue(value);
          setEditing(true);
        }}
      >
        {value || "-"}
      </span>
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
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setEditing(false);
      }}
      autoFocus
    />
  );
}
