"use client";

import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { orpc } from "@/lib/orpc";
import { type Department } from "../data/schema";

const formSchema = z.object({
  name: z.string().min(1, "Name is required."),
  description: z.string().optional(),
});

type DepartmentForm = z.infer<typeof formSchema>;

type DepartmentActionDialogProps = {
  currentRow?: Department;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DepartmentsActionDialog({
  currentRow,
  open,
  onOpenChange,
}: DepartmentActionDialogProps) {
  const isEdit = !!currentRow;
  const queryClient = useQueryClient();

  const form = useForm<DepartmentForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? { name: currentRow.name, description: currentRow.description ?? "" }
      : { name: "", description: "" },
  });

  const createMutation = useMutation(
    orpc.department.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.department.list.queryOptions());
        toast.success("Department created successfully.");
        form.reset();
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    orpc.department.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.department.list.queryOptions());
        toast.success("Department updated successfully.");
        form.reset();
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: DepartmentForm) => {
    if (isEdit) {
      updateMutation.mutate({ id: currentRow.id, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset();
        onOpenChange(state);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle>{isEdit ? "Edit Department" : "Add New Department"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the department here. " : "Create a new department here. "}
            Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <form id="department-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Name</FieldLabel>
                  <Input
                    placeholder="e.g., Engineering"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Description (optional)</FieldLabel>
                  <Textarea
                    className="resize-none"
                    placeholder="Brief description of the department"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form="department-form" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
