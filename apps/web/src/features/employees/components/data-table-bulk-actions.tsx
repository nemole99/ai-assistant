import { DataTableBulkActions as BulkActionsToolbar } from "@/components/data-table";
import { type Table } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { EmployeesMultiDeleteDialog } from "./employees-multi-delete-dialog";
import { type Employee } from "../data/schema";

type DataTableBulkActionsProps = {
  table: Table<Employee>;
};

export function DataTableBulkActions({ table }: DataTableBulkActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const _selectedRows = table.getFilteredSelectedRowModel().rows;

  return (
    <>
      <BulkActionsToolbar table={table} entityName="employee">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setShowDeleteConfirm(true)}
                className="size-8"
                aria-label="Delete selected employees"
                title="Delete selected employees"
              />
            }
          >
            <Trash2 />
            <span className="sr-only">Delete selected employees</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete selected employees</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <EmployeesMultiDeleteDialog
        table={table}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      />
    </>
  );
}
