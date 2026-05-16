import type { AppRouterClient } from "@workspace/api/routers/index";

export type Employee = Awaited<
  ReturnType<AppRouterClient["employee"]["list"]>
>[number];

export type EmployeeStatus = Employee["status"];
