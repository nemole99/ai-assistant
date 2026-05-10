"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { orpc } from "@/lib/orpc";
import { type Employee } from "../data/schema";

type EmployeeDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRow: Employee;
};

export function EmployeesDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: EmployeeDeleteDialogProps) {
  const [value, setValue] = useState("");
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    orpc.employee.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.employee.list.queryOptions());
        toast.success("Employee deleted successfully.");
        setValue("");
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const handleDelete = () => {
    if (value.trim() !== currentRow.fullName) return;
    deleteMutation.mutate({ id: currentRow.id });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form="employees-delete-form"
      disabled={value.trim() !== currentRow.fullName || deleteMutation.isPending}
      title={
        <span className="text-destructive">
          <AlertTriangle className="me-1 inline-block stroke-destructive" size={18} /> Delete
          Employee
        </span>
      }
      desc={
        <form
          id="employees-delete-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleDelete();
          }}
          className="space-y-4"
        >
          <p className="mb-2">
            Are you sure you want to delete <span className="font-bold">{currentRow.fullName}</span>
            ?
            <br />
            This action will permanently remove the employee from the system. This cannot be undone.
          </p>

          <Label className="my-2">
            Full name:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter full name to confirm deletion."
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
      confirmText={deleteMutation.isPending ? "Deleting..." : "Delete"}
      destructive
    />
  );
}
