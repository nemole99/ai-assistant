import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { Plus } from "lucide-react";
import { useState, useMemo } from "react";

import { ContentLayout } from "@/components/layout/content-layout";
import { Loader } from "@/components/loader";

import {
  useTimesheetMonth,
  useUpdateTimesheetCell,
  useAddTimesheetEmployee,
  useSetTimesheetHolidays,
} from "../hooks/use-timesheet";

// Cell states: "" → "x" → "L" → "H" → ""
// "" = chưa đi làm (not worked)
// "x" = đã đi làm (worked/present)
// "L" = nghỉ phép (full-day leave)
// "H" = nghỉ 1/2 phép (half-day leave)
const CELL_STATES = ["", "x", "L", "H"] as const;
type CellState = (typeof CELL_STATES)[number];

function getNextCellState(current: string): CellState {
  const idx = CELL_STATES.indexOf(current as CellState);
  return CELL_STATES[(idx + 1) % CELL_STATES.length];
}

function getCellDisplay(value: string) {
  switch (value) {
    case "x": {
      return { label: "✓", title: "Đã đi làm" };
    }
    case "L": {
      return { label: "P", title: "Nghỉ phép" };
    }
    case "H": {
      return { label: "½", title: "Nghỉ ½ phép" };
    }
    default: {
      return { label: "", title: "Chưa đi làm" };
    }
  }
}

export function CopilotEvaluationTimesheet() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [newEmployee, setNewEmployee] = useState("");

  const { data, isLoading } = useTimesheetMonth(month);
  const updateCell = useUpdateTimesheetCell();
  const addEmployee = useAddTimesheetEmployee();
  const setHolidays = useSetTimesheetHolidays();

  const daysInMonth = useMemo(() => {
    const [year, m] = month.split("-").map(Number);
    return new Date(year, m, 0).getDate();
  }, [month]);

  const weekendDays = useMemo(() => {
    const [year, m] = month.split("-").map(Number);
    const weekends: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, m - 1, day).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekends.push(day);
      }
    }
    return new Set(weekends);
  }, [month, daysInMonth]);

  const holidaySet = useMemo(() => new Set(data?.holidays), [data?.holidays]);

  const isPastMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return month < currentMonth;
  }, [month]);

  const handleCellClick = (employeeName: string, day: number) => {
    // Don't allow editing past months, weekends or holidays
    if (isPastMonth || weekendDays.has(day) || holidaySet.has(day)) {
      return;
    }

    const currentValue =
      data?.employees.find((e) => e.name === employeeName)?.days[day] ?? "";
    const newValue = getNextCellState(currentValue);
    updateCell.mutate({ day, employee: employeeName, month, value: newValue });
  };

  const handleAddEmployee = () => {
    if (!newEmployee.trim() || isPastMonth) {
      return;
    }
    addEmployee.mutate({ employee: newEmployee.trim(), month });
    setNewEmployee("");
  };

  const handleToggleHoliday = (day: number) => {
    if (isPastMonth) {
      return;
    }
    const current = data?.holidays ?? [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    setHolidays.mutate({ holidays: updated, month });
  };

  return (
    <ContentLayout>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Timesheet</h2>
          <p className="text-muted-foreground">Monthly attendance tracking.</p>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {month} — {data?.employees.length ?? 0} employees
            </CardTitle>
            {!isPastMonth && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Employee name"
                  value={newEmployee}
                  onChange={(e) => setNewEmployee(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddEmployee()}
                  className="w-40"
                />
                <Button size="sm" onClick={handleAddEmployee}>
                  <Plus className="mr-1 size-3" />
                  Add
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="border p-1 text-left sticky left-0 bg-background min-w-28">
                    Name
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                    (day) => (
                      <th
                        key={day}
                        className={cn(
                          "border p-1 text-center min-w-7",
                          !isPastMonth && "cursor-pointer hover:bg-muted",
                          isPastMonth && "cursor-default",
                          weekendDays.has(day) &&
                            "bg-orange-100 dark:bg-orange-950",
                          holidaySet.has(day) && "bg-red-100 dark:bg-red-950"
                        )}
                        onClick={() => handleToggleHoliday(day)}
                        title={
                          isPastMonth ? undefined : "Click to toggle holiday"
                        }
                      >
                        {day}
                      </th>
                    )
                  )}
                  <th className="border p-1 text-center min-w-12">Days</th>
                </tr>
              </thead>
              <tbody>
                {data?.employees.map((emp) => {
                  const workingDays = Object.entries(emp.days).filter(
                    ([, v]) => v === "x"
                  ).length;
                  const halfDays = Object.entries(emp.days).filter(
                    ([, v]) => v === "H"
                  ).length;
                  const totalDays = workingDays + halfDays * 0.5;
                  return (
                    <tr key={emp.name}>
                      <td className="border p-1 font-medium sticky left-0 bg-background">
                        {emp.name}
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                        (day) => {
                          const value = emp.days[day] ?? "";
                          const isWeekend = weekendDays.has(day);
                          const isHoliday = holidaySet.has(day);
                          const isDisabled = isWeekend || isHoliday;
                          const display = getCellDisplay(value);
                          return (
                            <td
                              key={day}
                              className={cn(
                                "border p-1 text-center transition-colors select-none",
                                isDisabled || isPastMonth
                                  ? "bg-muted/60 cursor-not-allowed"
                                  : "cursor-pointer hover:bg-muted/50",
                                isWeekend &&
                                  !isHoliday &&
                                  "bg-orange-50 dark:bg-orange-950/50",
                                isHoliday && "bg-red-50 dark:bg-red-950/50",
                                !isDisabled &&
                                  value === "x" &&
                                  "bg-green-100 dark:bg-green-950 font-bold text-green-700 dark:text-green-400",
                                !isDisabled &&
                                  value === "L" &&
                                  "bg-blue-100 dark:bg-blue-950 font-bold text-blue-700 dark:text-blue-400",
                                !isDisabled &&
                                  value === "H" &&
                                  "bg-yellow-100 dark:bg-yellow-950 font-bold text-yellow-700 dark:text-yellow-400"
                              )}
                              onClick={() => handleCellClick(emp.name, day)}
                              title={
                                isDisabled
                                  ? (isHoliday
                                    ? "Nghỉ lễ"
                                    : "Cuối tuần")
                                  : display.title
                              }
                            >
                              {display.label}
                            </td>
                          );
                        }
                      )}
                      <td className="border p-1 text-center font-bold">
                        <Badge variant="secondary">{totalDays}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data?.employees.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No employees yet. Add one above to get started.
              </p>
            )}
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded border bg-green-100 dark:bg-green-950" />{" "}
                Đã đi làm (✓)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded border bg-blue-100 dark:bg-blue-950" />{" "}
                Nghỉ phép (P)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded border bg-yellow-100 dark:bg-yellow-950" />{" "}
                Nghỉ ½ phép (½)
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded border bg-orange-50 dark:bg-orange-950/50" />{" "}
                Cuối tuần
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-4 h-4 rounded border bg-red-50 dark:bg-red-950/50" />{" "}
                Nghỉ lễ
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </ContentLayout>
  );
}
