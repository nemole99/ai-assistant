"use client";

import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { SelectDropdown } from "@/components/select-dropdown";
import { orpc } from "@/lib/orpc";
import { type Employee } from "../data/schema";

const formSchema = z.object({
  fullName: z.string().min(1, "Full name is required."),
  email: z.email({
    error: (iss) => (iss.input === "" ? "Email is required." : undefined),
  }),
  position: z.string().min(1, "Position is required."),
  departmentId: z.string().min(1, "Department is required."),
});

type EmployeeForm = z.infer<typeof formSchema>;

type EmployeeActionDialogProps = {
  currentRow?: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EmployeesActionDialog({
  currentRow,
  open,
  onOpenChange,
}: EmployeeActionDialogProps) {
  const isEdit = !!currentRow;
  const queryClient = useQueryClient();

  const { data: departments = [] } = useQuery(orpc.department.list.queryOptions());

  const form = useForm<EmployeeForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          fullName: currentRow.fullName,
          email: currentRow.email,
          position: currentRow.position,
          departmentId: currentRow.departmentId,
        }
      : {
          fullName: "",
          email: "",
          position: "",
          departmentId: "",
        },
  });

  const createMutation = useMutation(
    orpc.employee.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.employee.list.queryOptions());
        toast.success("Employee created successfully.");
        form.reset();
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    orpc.employee.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.employee.list.queryOptions());
        toast.success("Employee updated successfully.");
        form.reset();
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: EmployeeForm) => {
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
          <DialogTitle>{isEdit ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the employee here. " : "Create a new employee here. "}
            Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <form id="employee-form" onSubmit={form.handleSubmit(onSubmit)} className="px-0.5">
          <FieldGroup>
            <Controller
              control={form.control}
              name="fullName"
              render={({ field, fieldState }) => (
                <Field
                  className="grid grid-cols-6 items-center gap-x-4 gap-y-1"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel className="col-span-2 text-end">Full Name</FieldLabel>
                  <Input
                    placeholder="John Doe"
                    className="col-span-4"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError className="col-span-4 col-start-3" errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field
                  className="grid grid-cols-6 items-center gap-x-4 gap-y-1"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel className="col-span-2 text-end">Email</FieldLabel>
                  <Input
                    placeholder="john.doe@company.com"
                    className="col-span-4"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError className="col-span-4 col-start-3" errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="position"
              render={({ field, fieldState }) => (
                <Field
                  className="grid grid-cols-6 items-center gap-x-4 gap-y-1"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel className="col-span-2 text-end">Position</FieldLabel>
                  <Input
                    placeholder="Software Engineer"
                    className="col-span-4"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && (
                    <FieldError className="col-span-4 col-start-3" errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="departmentId"
              render={({ field, fieldState }) => (
                <Field
                  className="grid grid-cols-6 items-center gap-x-4 gap-y-1"
                  data-invalid={fieldState.invalid}
                >
                  <FieldLabel className="col-span-2 text-end">Department</FieldLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select a department"
                    className="col-span-4"
                    items={departments.map(({ id, name }) => ({
                      label: name,
                      value: id,
                    }))}
                  />
                  {fieldState.invalid && (
                    <FieldError className="col-span-4 col-start-3" errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form="employee-form" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
