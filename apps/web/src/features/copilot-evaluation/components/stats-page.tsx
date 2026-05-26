import { useState, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ContentLayout } from "@/components/layout/content-layout";
import { Loader } from "@/components/loader";
import { Input } from "@workspace/ui/components/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { useChartData, useEfficiencyData } from "../hooks/use-tickets";

// Color palette for individual developer bars (blue-green gradient)
const BAR_COLORS = [
  "#0066cc", "#1a75d1", "#3384d6", "#0088cc", "#1a99d1",
  "#33aad6", "#00aacc", "#1abbd1", "#33ccd6", "#00ccaa",
  "#1ad1aa", "#33d6aa", "#008866", "#1a9966", "#33aa77",
  "#66bb88", "#99cc99", "#aaddaa", "#0055aa", "#3366bb",
  "#003388",
];

function getMonthLabel(month: string) {
  const [year, m] = month.split("-");
  return `Tháng ${m}/${year}`;
}

export function CopilotEvaluationStats() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const { data: chartData, isLoading: chartLoading } = useChartData(month);
  const { data: efficiencyData, isLoading: effLoading } = useEfficiencyData(month);

  const isLoading = chartLoading || effLoading;

  const sortedChartData = useMemo(() => {
    if (!chartData?.data) return [];
    return [...chartData.data].sort((a, b) => b.count - a.count);
  }, [chartData]);

  const sortedEfficiencyData = useMemo(() => {
    if (!efficiencyData?.data) return [];
    return [...efficiencyData.data].sort((a, b) => a.developer.localeCompare(b.developer));
  }, [efficiencyData]);

  const totalTickets = useMemo(() => {
    return sortedChartData.reduce((sum, d) => sum + d.count, 0);
  }, [sortedChartData]);

  return (
    <ContentLayout>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Statistics</h2>
          <p className="text-muted-foreground">Developer effort statistics and efficiency metrics.</p>
        </div>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-40"
        />
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <>
          {/* Ticket Count per Developer - Vertical Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Số ticket theo Developer – {getMonthLabel(month)}</CardTitle>
              <CardDescription>
                {sortedChartData.length} developer · {totalTickets} ticket
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sortedChartData.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <ResponsiveContainer width="100%" height={420}>
                    <BarChart
                      data={sortedChartData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="developer"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        label={{ value: "Số lượng ticket", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
                        tick={{ fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        formatter={(value: number) => [value, "Tickets"]}
                        cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {sortedChartData.map((_, index) => (
                          <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No data for this month</p>
              )}
            </CardContent>
          </Card>

          {/* Efficiency per Developer - Grouped Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Bảng thống kê hiệu quả Copilot – {getMonthLabel(month)}</CardTitle>
              <CardDescription>
                {sortedEfficiencyData.length} developer · Investigate / Code/Fix / Review
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sortedEfficiencyData.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <ResponsiveContainer width="100%" height={420}>
                    <BarChart
                      data={sortedEfficiencyData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="developer"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        label={{ value: "Hiệu quả (%)", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${v}%`}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                        cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ paddingBottom: 10 }}
                      />
                      <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                      <Bar dataKey="investigateEff" name="Investigate" fill="#003399" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="codeEff" name="Code/Fix" fill="#3388cc" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="reviewEff" name="Review" fill="#44bb88" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No data for this month</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </ContentLayout>
  );
}
