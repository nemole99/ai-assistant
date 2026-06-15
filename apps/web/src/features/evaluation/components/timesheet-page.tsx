import { useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { CardTitle } from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import { Plus } from "lucide-react";
import { useState, useMemo } from "react";

import { Loader } from "@/components/loader";
import { MonthPicker } from "@/components/month-picker";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

import { useMonthWithDefault } from "../hooks/use-month";
import {
  useTimesheetMonth,
  useUpdateTimesheetCell,
  useAddTimesheetEmployee,
  useSetTimesheetHolidays,
  useTimesheetEmployees,
  useLatestTimesheetMonth,
} from "../hooks/use-timesheet";

const CELL_STATES = ["", "x", "x/2", "-"] as const;
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
    case "x/2": {
      return { label: "½", title: "Nửa ngày" };
    }
    case "-": {
      return { label: "P", title: "Nghỉ phép" };
    }
    default: {
      return { label: "", title: "Chưa đi làm" };
    }
  }
}

export function EvaluationTimesheet() {
  // Default to the latest month that has data; fall back to the current month.
  const { data: session } = authClient.useSession();
  const isEmployee = session?.user?.role === "EMPLOYEE";
  const { data: selfEmployee } = useQuery(orpc.employee.getSelf.queryOptions());

  const { data: latest } = useLatestTimesheetMonth();
  const [month, setMonthOverride] = useMonthWithDefault(latest?.month);
  const [newEmployeeId, setNewEmployeeId] = useState("");

  const { data, isLoading } = useTimesheetMonth(month);
  const { data: activeEmployees = [] } = useTimesheetEmployees();
  const updateCell = useUpdateTimesheetCell();
  const addEmployee = useAddTimesheetEmployee();
  const setHolidays = useSetTimesheetHolidays();

  const daysInMonth = useMemo(() => {
    const [year, m] = month.split("-").map(Number);
    return new Date(year!, m!, 0).getDate();
  }, [month]);

  const weekendDays = useMemo(() => {
    const [year, m] = month.split("-").map(Number);
    const weekends: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = new Date(year!, m! - 1, day).getDay();
      if (dow === 0 || dow === 6) {
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

  const handleCellClick = (employeeId: string, day: number) => {
    if (isPastMonth || weekendDays.has(day) || holidaySet.has(day)) {
      return;
    }
    if (isEmployee && selfEmployee?.id !== employeeId) {
      return;
    }
    const currentValue =
      data?.employees.find((e) => e.employeeId === employeeId)?.days[day] ?? "";
    const newValue = getNextCellState(currentValue);
    updateCell.mutate({ day, employeeId, month, value: newValue });
  };

  const handleAddEmployee = () => {
    if (!newEmployeeId || isPastMonth) {
      return;
    }
    addEmployee.mutate({ employeeId: newEmployeeId, month });
    setNewEmployeeId("");
  };

  const handleToggleHoliday = (day: number) => {
    if (isPastMonth || isEmployee) {
      return;
    }
    const current = data?.holidays ?? [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    setHolidays.mutate({ holidays: updated, month });
  };

  // Employees already in this month's timesheet
  const alreadyAdded = useMemo(
    () => new Set(data?.employees.map((e) => e.employeeId)),
    [data?.employees]
  );

  const availableEmployees = activeEmployees.filter(
    (e) => !alreadyAdded.has(e.id)
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Timesheet</h2>
          <p className="text-muted-foreground">Monthly attendance tracking.</p>
        </div>
        <MonthPicker value={month} onChange={setMonthOverride} />
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <CardTitle>
              {month} — {data?.employees.length ?? 0} employees
            </CardTitle>
            {!isPastMonth && !isEmployee && (
              <div className="flex items-center gap-2">
                <Select
                  items={availableEmployees.map((e) => ({
                    label: e.fullName,
                    value: e.id,
                  }))}
                  value={newEmployeeId}
                  onValueChange={(v) => setNewEmployeeId(v ?? "")}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Add employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleAddEmployee}
                  disabled={!newEmployeeId}
                >
                  <Plus className="mr-1 size-3" />
                  Add
                </Button>
              </div>
            )}{" "}
          </div>
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
                  ([, v]) => v === "x/2"
                ).length;
                const totalDays = workingDays + halfDays * 0.5;
                return (
                  <tr key={emp.employeeId}>
                    <td className="border p-1 font-medium sticky left-0 bg-background">
                      {emp.fullName}
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
                      (day) => {
                        const value = emp.days[day] ?? "";
                        const isWeekend = weekendDays.has(day);
                        const isHoliday = holidaySet.has(day);
                        const isOtherRow =
                          isEmployee && selfEmployee?.id !== emp.employeeId;
                        const isDisabled = isWeekend || isHoliday || isOtherRow;
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
                                value === "-" &&
                                "bg-blue-100 dark:bg-blue-950 font-bold text-blue-700 dark:text-blue-400",
                              !isDisabled &&
                                value === "x/2" &&
                                "bg-yellow-100 dark:bg-yellow-950 font-bold text-yellow-700 dark:text-yellow-400"
                            )}
                            onClick={() => handleCellClick(emp.employeeId, day)}
                            title={
                              isDisabled
                                ? isHoliday
                                  ? "Nghỉ lễ"
                                  : "Cuối tuần"
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
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded border bg-green-100 dark:bg-green-950" />{" "}
              Đã đi làm (✓)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded border bg-yellow-100 dark:bg-yellow-950" />{" "}
              Nửa ngày (½)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded border bg-blue-100 dark:bg-blue-950" />{" "}
              Nghỉ phép (P)
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
        </>
      )}
    </>
  );
}
