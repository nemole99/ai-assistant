"use client";

import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { showSubmittedData } from "@/lib/show-submitted-data";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
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
  const form = useForm<DepartmentForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? { name: currentRow.name, description: currentRow.description ?? "" }
      : { name: "", description: "" },
  });

  const onSubmit = (values: DepartmentForm) => {
    form.reset();
    showSubmittedData(values);
    onOpenChange(false);
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
          <DialogTitle>
            {isEdit ? "Edit Department" : "Add New Department"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the department here. "
              : "Create a new department here. "}
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form="department-form">
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
