"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Table } from "@tanstack/react-table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { orpc } from "@/lib/orpc";

import type { Employee } from "../data/schema";

interface EmployeesMultiDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: Table<Employee>;
}

const CONFIRM_WORD = "DELETE";

export function EmployeesMultiDeleteDialog({
  open,
  onOpenChange,
  table,
}: EmployeesMultiDeleteDialogProps) {
  const [value, setValue] = useState("");
  const queryClient = useQueryClient();

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const bulkDeleteMutation = useMutation(
    orpc.employee.bulkDelete.mutationOptions({
      onError: (err) => toast.error(err.message),
      onSuccess: ({ count }) => {
        queryClient.invalidateQueries(orpc.employee.list.queryOptions());
        toast.success(
          `Deleted ${count} ${count === 1 ? "employee" : "employees"} successfully.`
        );
        setValue("");
        table.resetRowSelection();
        onOpenChange(false);
      },
    })
  );

  const handleDelete = () => {
    if (value.trim() !== CONFIRM_WORD) {
      toast.error(`Please type "${CONFIRM_WORD}" to confirm.`);
      return;
    }

    const ids = selectedRows.map((row) => row.original.id);
    bulkDeleteMutation.mutate({ ids });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form="employees-multi-delete-form"
      disabled={value.trim() !== CONFIRM_WORD || bulkDeleteMutation.isPending}
      title={
        <span className="text-destructive">
          <AlertTriangle
            className="me-1 inline-block stroke-destructive"
            size={18}
          />{" "}
          Delete {selectedRows.length}{" "}
          {selectedRows.length > 1 ? "employees" : "employee"}
        </span>
      }
      desc={
        <form
          id="employees-multi-delete-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleDelete();
          }}
          className="space-y-4"
        >
          <p className="mb-2">
            Are you sure you want to delete the selected employees? <br />
            This action cannot be undone.
          </p>

          <Label className="my-4 flex flex-col items-start gap-1.5">
            <span>Confirm by typing "{CONFIRM_WORD}":</span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Type "${CONFIRM_WORD}" to confirm.`}
              autoFocus
            />
          </Label>

          <Alert variant="destructive">
            <AlertTitle>Warning!</AlertTitle>
            <AlertDescription>
              Please be careful, this operation can not be rolled back.
            </AlertDescription>
          </Alert>
        </form>
      }
      confirmText="Delete"
      destructive
    />
  );
}
