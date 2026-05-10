import { type EmployeeStatus } from "./schema";

export const employeeStatuses = new Map<EmployeeStatus, string>([
  ["ACTIVE", "bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200"],
  ["INACTIVE", "bg-neutral-300/40 border-neutral-300"],
]);

export const departmentOptions = [
  { label: "Administration", value: "dept-1" },
  { label: "GPP", value: "dept-2" },
  { label: "Weclever", value: "dept-3" },
  { label: "Dent", value: "dept-4" },
  { label: "HR", value: "dept-5" },
  { label: "QA", value: "dept-6" },
] as const;
