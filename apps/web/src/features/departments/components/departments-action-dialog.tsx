import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";
import { z } from "zod";

import { orpc } from "@/lib/orpc";

import type { Department } from "../data/schema";

const formSchema = z.object({
  description: z.string(),
  name: z.string().min(1, "Name is required."),
});

interface DepartmentActionDialogProps {
  currentRow?: Department;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepartmentsActionDialog({
  currentRow,
  open,
  onOpenChange,
}: DepartmentActionDialogProps) {
  const isEdit = !!currentRow;
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    orpc.department.create.mutationOptions({
      onError: (err) => toast.error(err.message),
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.department.list.queryOptions());
        toast.success("Department created successfully.");
        form.reset();
        onOpenChange(false);
      },
    })
  );

  const updateMutation = useMutation(
    orpc.department.update.mutationOptions({
      onError: (err) => toast.error(err.message),
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.department.list.queryOptions());
        toast.success("Department updated successfully.");
        form.reset();
        onOpenChange(false);
      },
    })
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm({
    defaultValues: isEdit
      ? { description: currentRow.description ?? "", name: currentRow.name }
      : { description: "", name: "" },
    onSubmit: ({ value }) => {
      if (isEdit) {
        updateMutation.mutate({ id: currentRow.id, ...value });
      } else {
        createMutation.mutate(value);
      }
    },
    validators: {
      onSubmit: formSchema,
    },
  });

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
        <form
          id="department-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field
              name="name"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., Engineering"
                      autoComplete="off"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
            <form.Field
              name="description"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Description (optional)
                    </FieldLabel>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="resize-none"
                      placeholder="Brief description of the department"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
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
