"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { orpc } from "@/lib/orpc";
import { type Project } from "../data/schema";

type ProjectDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRow: Project;
};

export function ProjectsDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: ProjectDeleteDialogProps) {
  const [value, setValue] = useState("");
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    orpc.project.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.project.list.queryOptions());
        toast.success("Project deleted successfully.");
        setValue("");
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const handleDelete = () => {
    if (value.trim() !== currentRow.name) return;
    deleteMutation.mutate({ id: currentRow.id });
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      form="projects-delete-form"
      disabled={value.trim() !== currentRow.name || deleteMutation.isPending}
      title={
        <span className="text-destructive">
          <AlertTriangle
            className="me-1 inline-block stroke-destructive"
            size={18}
          />{" "}
          Delete Project
        </span>
      }
      desc={
        <form
          id="projects-delete-form"
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
            This action will permanently remove the project and all its members
            and cannot be undone.
          </p>
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Warning!</AlertTitle>
            <AlertDescription>
              All project membership data will be lost.
            </AlertDescription>
          </Alert>
          <Label className="my-2">
            Project name:
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter project name to confirm deletion."
              autoFocus
            />
          </Label>
        </form>
      }
      confirmText="Delete"
    />
  );
}
