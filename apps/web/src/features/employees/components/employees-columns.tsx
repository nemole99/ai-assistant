import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { cn } from "@workspace/ui/lib/utils";

import { DataTableColumnHeader } from "@/components/data-table";
import { LongText } from "@/components/long-text";

import type { Employee, EmployeeStatus } from "../data/schema";
import { DataTableRowActions } from "./data-table-row-actions";

const employeeStatuses: Record<EmployeeStatus, string> = {
  ACTIVE: "text-green-600 border-green-600/30 bg-green-600/10",
  INACTIVE: "text-red-500 border-red-500/30 bg-red-500/10",
};

const userRoleColors: Record<string, string> = {
  ADMIN: "text-red-500 border-red-500/30 bg-red-500/10",
  EMPLOYEE: "text-blue-500 border-blue-500/30 bg-blue-500/10",
  MANAGER: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10",
};

export const employeesColumns: ColumnDef<Employee>[] = [
  {
    cell: ({ row }) => (
      <span className="ps-3 text-muted-foreground text-sm tabular-nums">
        {row.index + 1}
      </span>
    ),
    enableHiding: false,
    enableSorting: false,
    header: () => <span className="ps-3 text-muted-foreground">#</span>,
    id: "rowNumber",
  },
  {
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableHiding: false,
    enableSorting: false,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-0.5"
      />
    ),
    id: "select",
    meta: {
      className: cn("inset-s-0 z-10 rounded-tl-[inherit] max-md:sticky"),
    },
  },
  {
    accessorKey: "fullName",
    cell: ({ row }) => (
      <LongText className="max-w-36">{row.getValue("fullName")}</LongText>
    ),
    enableHiding: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "email",
    cell: ({ row }) => (
      <div className="w-fit text-nowrap">{row.getValue("email")}</div>
    ),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
  },
  {
    accessorKey: "position",
    cell: ({ row }) => (
      <LongText className="max-w-36">{row.getValue("position")}</LongText>
    ),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Position" />
    ),
  },
  {
    accessorKey: "departmentName",
    cell: ({ row }) => <span>{row.getValue("departmentName")}</span>,
    enableSorting: false,
    filterFn: (row, id, value) => value.includes(row.original.departmentId),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Department" />
    ),
  },
  {
    accessorKey: "userRole",
    cell: ({ row }) => {
      const role = row.getValue<string | null>("userRole");
      if (!role) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <Badge
          variant="outline"
          className={cn("capitalize", userRoleColors[role])}
        >
          {role.toLowerCase()}
        </Badge>
      );
    },
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="System Role" />
    ),
  },
  {
    accessorKey: "status",
    cell: ({ row }) => {
      const { status } = row.original;
      const badgeColor = employeeStatuses[status];
      return (
        <Badge variant="outline" className={cn("capitalize", badgeColor)}>
          {status.toLowerCase()}
        </Badge>
      );
    },
    enableHiding: false,
    enableSorting: false,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
  },
  {
    cell: DataTableRowActions,
    id: "actions",
  },
];
