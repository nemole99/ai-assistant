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
import { type Department } from "../data/schema";

type DepartmentDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRow: Department;
};

export function DepartmentsDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: DepartmentDeleteDialogProps) {
  const [value, setValue] = useState("");

  const handleDelete = () => {
    if (value.trim() !== currentRow.name) return;
    onOpenChange(false);
    showSubmittedData(currentRow, "The following department has been deleted:");
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form="departments-delete-form"
      disabled={value.trim() !== currentRow.name}
      title={
        <span className="text-destructive">
          <AlertTriangle
            className="me-1 inline-block stroke-destructive"
            size={18}
          />{" "}
          Delete Department
        </span>
      }
      desc={
        <form
          id="departments-delete-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleDelete();
          }}
          className="space-y-4"
        >
          <p className="mb-2">
            Are you sure you want to delete{" "}
            <span className="font-bold">{currentRow.name}</span>?
            <br />
            This action will permanently remove the department and cannot be
            undone.
          </p>

          <Label className="my-2">
            Department name:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter department name to confirm deletion."
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
