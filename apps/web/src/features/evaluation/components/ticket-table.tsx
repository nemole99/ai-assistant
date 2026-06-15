import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect } from "react";

import { DataTablePagination, DataTableToolbar } from "@/components/data-table";
import { useTableUrlState } from "@/hooks/use-table-url-state";
import type { NavigateFn } from "@/hooks/use-table-url-state";

import type { EvaluationTicket } from "../data/schema";
import { ticketColumns as columns } from "./ticket-columns";

interface TicketStats {
  developers: { id: string; fullName: string; count: number }[];
  projects: { id: string; name: string; count: number }[];
  categories: { bug: number; feature: number };
}

interface TicketTableProps {
  data: EvaluationTicket[];
  search: Record<string, unknown>;
  navigate: NavigateFn;
  developers: { id: string; fullName: string }[];
  projects: { id: string; name: string }[];
  pageCount: number;
  rowCount: number;
  stats?: TicketStats;
}

export function TicketTable({
  data,
  search,
  navigate,
  developers,
  projects,
  pageCount,
  rowCount,
  stats,
}: TicketTableProps) {
  const devCountMap = Object.fromEntries(
    (stats?.developers ?? []).map((d) => [d.id, d.count])
  );
  const projCountMap = Object.fromEntries(
    (stats?.projects ?? []).map((p) => [p.id, p.count])
  );
  const {
    columnFilters,
    onColumnFiltersChange,
    globalFilter,
    onGlobalFilterChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    columnFilters: [
      { columnId: "fullName", searchKey: "employee", type: "array" },
      { columnId: "projectName", searchKey: "project", type: "array" },
      { columnId: "category", searchKey: "category", type: "array" },
    ],
    globalFilter: { key: "ticket" },
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    search,
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data,
    enableRowSelection: false,
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualFiltering: true,
    manualPagination: true,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onPaginationChange,
    pageCount,
    rowCount,
    state: {
      columnFilters,
      globalFilter,
      pagination,
    },
  });

  useEffect(() => {
    ensurePageInRange(table.getPageCount());
  }, [table, ensurePageInRange]);

  return (
    <div className={cn("flex flex-1 flex-col gap-4")}>
      <DataTableToolbar
        table={table}
        searchPlaceholder="Search ticket..."
        filters={[
          {
            columnId: "fullName",
            options: developers.map((d) => ({
              count: devCountMap[d.id],
              label: d.fullName,
              value: d.id,
            })),
            title: "Developer",
          },
          {
            columnId: "projectName",
            options: projects.map((p) => ({
              count: projCountMap[p.id],
              label: p.name,
              value: p.id,
            })),
            title: "Project",
          },
          {
            columnId: "category",
            options: [
              { count: stats?.categories.bug, label: "Bug", value: "bug" },
              {
                count: stats?.categories.feature,
                label: "Feature",
                value: "feature",
              },
            ],
            singleSelect: true,
            title: "Category",
          },
        ]}
      />
      <div className="overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="group/row">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      "bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted",
                      header.column.columnDef.meta?.className,
                      header.column.columnDef.meta?.thClassName
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group/row"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted",
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No tickets found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} className="mt-auto" />
    </div>
  );
}
