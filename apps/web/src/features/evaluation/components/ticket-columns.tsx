import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { ExternalLink } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table";

import type { EvaluationTicket } from "../data/schema";
import { DataTableRowActions } from "./data-table-row-actions";

const categoryColors: Record<string, string> = {
  bug: "text-red-500 border-red-500/30 bg-red-500/10",
  feature: "text-blue-500 border-blue-500/30 bg-blue-500/10",
};

export const ticketColumns: ColumnDef<EvaluationTicket>[] = [
  {
    accessorKey: "fullName",
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("fullName")}</span>
    ),
    enableSorting: false,
    filterFn: (row, _id, value) => value.includes(row.original.employeeId),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Developer" />
    ),
  },
  {
    accessorKey: "projectName",
    cell: ({ row }) => <span>{row.getValue("projectName")}</span>,
    enableSorting: false,
    filterFn: (row, _id, value) => value.includes(row.original.projectId),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Project" />
    ),
  },
  {
    accessorKey: "category",
    cell: ({ row }) => {
      const cat = row.getValue<string>("category");
      return (
        <Badge
          variant="outline"
          className={cn("capitalize", categoryColors[cat])}
        >
          {cat}
        </Badge>
      );
    },
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
  },
  {
    accessorKey: "ticketUrl",
    cell: ({ row }) => {
      const url = row.getValue<string>("ticketUrl");
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <ExternalLink className="size-3" />
          {url.split("/").pop() || "Link"}
        </a>
      );
    },
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Ticket" />
    ),
  },
  {
    accessorKey: "processDate",
    cell: ({ row }) => <span>{row.getValue("processDate")}</span>,
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
  },
  {
    accessorKey: "totalEffort",
    cell: ({ row }) => (
      <div className="text-right">{row.getValue("totalEffort")}</div>
    ),
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Total (h)"
        className="justify-end"
      />
    ),
    meta: { className: "text-right" },
  },
  {
    accessorKey: "investigateActual",
    cell: ({ row }) => (
      <div className="text-right">{row.getValue("investigateActual")}</div>
    ),
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Investigate (h)"
        className="justify-end"
      />
    ),
    meta: { className: "text-right" },
  },
  {
    accessorKey: "codeFixActual",
    cell: ({ row }) => (
      <div className="text-right">{row.getValue("codeFixActual")}</div>
    ),
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Code Fix (h)"
        className="justify-end"
      />
    ),
    meta: { className: "text-right" },
  },
  {
    accessorKey: "codeReviewActual",
    cell: ({ row }) => (
      <div className="text-right">{row.getValue("codeReviewActual")}</div>
    ),
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Review (h)"
        className="justify-end"
      />
    ),
    meta: { className: "text-right" },
  },
  {
    accessorKey: "reopenStatus",
    cell: ({ row }) => {
      const status = row.getValue<number>("reopenStatus");
      return (
        <Badge variant={status === 1 ? "destructive" : "secondary"}>
          {status === 1 ? "Yes" : "No"}
        </Badge>
      );
    },
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Reopen" />
    ),
  },
  {
    cell: DataTableRowActions,
    id: "actions",
  },
];
