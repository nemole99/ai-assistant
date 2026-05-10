"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { showSubmittedData } from "@/lib/show-submitted-data";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
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

  const handleDelete = () => {
    if (value.trim() !== currentRow.employeeCode) return;
    onOpenChange(false);
    showSubmittedData(currentRow, "The following employee has been deleted:");
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form="employees-delete-form"
      disabled={value.trim() !== currentRow.employeeCode}
      title={
        <span className="text-destructive">
          <AlertTriangle
            className="me-1 inline-block stroke-destructive"
            size={18}
          />{" "}
          Delete Employee
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
            Are you sure you want to delete{" "}
            <span className="font-bold">{currentRow.fullName}</span> (
            <span className="font-mono">{currentRow.employeeCode}</span>)?
            <br />
            This action will permanently remove the employee from the system.
            This cannot be undone.
          </p>

          <Label className="my-2">
            Employee code:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter employee code to confirm deletion."
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
