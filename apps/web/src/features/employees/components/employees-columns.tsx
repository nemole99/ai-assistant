import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@workspace/ui/lib/utils";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { DataTableColumnHeader } from "@/components/data-table";
import { LongText } from "@/components/long-text";
import { EmployeeStatus, type Employee } from "../data/schema";
import { DataTableRowActions } from "./data-table-row-actions";

const employeeStatuses: Record<EmployeeStatus, string> = {
  ACTIVE: "text-green-600 border-green-600/30 bg-green-600/10",
  INACTIVE: "text-red-500 border-red-500/30 bg-red-500/10",
};

const userRoleColors: Record<string, string> = {
  ADMIN: "text-red-500 border-red-500/30 bg-red-500/10",
  MANAGER: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10",
  EMPLOYEE: "text-blue-500 border-blue-500/30 bg-blue-500/10",
};

export const employeesColumns: ColumnDef<Employee>[] = [
  {
    id: "rowNumber",
    header: () => <span className="ps-3 text-muted-foreground">#</span>,
    cell: ({ row }) => (
      <span className="ps-3 text-muted-foreground text-sm tabular-nums">{row.index + 1}</span>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-0.5"
      />
    ),
    meta: {
      className: cn("inset-s-0 z-10 rounded-tl-[inherit] max-md:sticky"),
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "fullName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <LongText className="max-w-36">{row.getValue("fullName")}</LongText>,
    enableHiding: false,
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => <div className="w-fit text-nowrap">{row.getValue("email")}</div>,
  },
  {
    accessorKey: "position",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Position" />,
    cell: ({ row }) => <LongText className="max-w-36">{row.getValue("position")}</LongText>,
  },
  {
    accessorKey: "departmentName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
    cell: ({ row }) => <span>{row.getValue("departmentName")}</span>,
    filterFn: (row, id, value) => {
      return value.includes(row.original.departmentId);
    },
    enableSorting: false,
  },
  {
    accessorKey: "userRole",
    header: ({ column }) => <DataTableColumnHeader column={column} title="System Role" />,
    cell: ({ row }) => {
      const role = row.getValue<string | null>("userRole");
      if (!role) return <span className="text-muted-foreground">—</span>;
      return (
        <Badge variant="outline" className={cn("capitalize", userRoleColors[role])}>
          {role.toLowerCase()}
        </Badge>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const { status } = row.original;
      const badgeColor = employeeStatuses[status];
      return (
        <Badge variant="outline" className={cn("capitalize", badgeColor)}>
          {status.toLowerCase()}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "actions",
    cell: DataTableRowActions,
  },
];
