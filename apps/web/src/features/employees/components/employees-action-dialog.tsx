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
import { SelectDropdown } from "@/components/select-dropdown";
import { departmentOptions } from "../data/data";
import { type Employee } from "../data/schema";

const formSchema = z.object({
  employeeCode: z.string().min(1, "Employee code is required."),
  fullName: z.string().min(1, "Full name is required."),
  email: z.email({
    error: (iss) => (iss.input === "" ? "Email is required." : undefined),
  }),
  phone: z.string().optional(),
  position: z.string().min(1, "Position is required."),
  departmentId: z.string().min(1, "Department is required."),
  joinDate: z.string().min(1, "Join date is required."),
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
  const form = useForm<EmployeeForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          employeeCode: currentRow.employeeCode,
          fullName: currentRow.fullName,
          email: currentRow.email,
          phone: currentRow.phone ?? "",
          position: currentRow.position,
          departmentId: currentRow.departmentId,
          joinDate: currentRow.joinDate,
        }
      : {
          employeeCode: "",
          fullName: "",
          email: "",
          phone: "",
          position: "",
          departmentId: "",
          joinDate: "",
        },
  });

  const onSubmit = (values: EmployeeForm) => {
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
            {isEdit ? "Edit Employee" : "Add New Employee"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the employee here. "
              : "Create a new employee here. "}
            Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <div className="h-105 w-[calc(100%+0.75rem)] overflow-y-auto py-1 pe-3">
          <form
            id="employee-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="px-0.5"
          >
            <FieldGroup>
              <Controller
                control={form.control}
                name="employeeCode"
                render={({ field, fieldState }) => (
                  <Field
                    className="grid grid-cols-6 items-center gap-x-4 gap-y-1"
                    data-invalid={fieldState.invalid}
                  >
                    <FieldLabel className="col-span-2 text-end">
                      Employee Code
                    </FieldLabel>
                    <Input
                      placeholder="EMP-0001"
                      className="col-span-4"
                      autoComplete="off"
                      disabled={isEdit}
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        className="col-span-4 col-start-3"
                        errors={[fieldState.error]}
                      />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="fullName"
                render={({ field, fieldState }) => (
                  <Field
                    className="grid grid-cols-6 items-center gap-x-4 gap-y-1"
                    data-invalid={fieldState.invalid}
                  >
                    <FieldLabel className="col-span-2 text-end">
                      Full Name
                    </FieldLabel>
                    <Input
                      placeholder="John Doe"
                      className="col-span-4"
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        className="col-span-4 col-start-3"
                        errors={[fieldState.error]}
                      />
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
                    <FieldLabel className="col-span-2 text-end">
                      Email
                    </FieldLabel>
                    <Input
                      placeholder="john.doe@company.com"
                      className="col-span-4"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        className="col-span-4 col-start-3"
                        errors={[fieldState.error]}
                      />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="phone"
                render={({ field, fieldState }) => (
                  <Field
                    className="grid grid-cols-6 items-center gap-x-4 gap-y-1"
                    data-invalid={fieldState.invalid}
                  >
                    <FieldLabel className="col-span-2 text-end">
                      Phone
                    </FieldLabel>
                    <Input
                      placeholder="+123456789"
                      className="col-span-4"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        className="col-span-4 col-start-3"
                        errors={[fieldState.error]}
                      />
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
                    <FieldLabel className="col-span-2 text-end">
                      Position
                    </FieldLabel>
                    <Input
                      placeholder="Software Engineer"
                      className="col-span-4"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        className="col-span-4 col-start-3"
                        errors={[fieldState.error]}
                      />
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
                    <FieldLabel className="col-span-2 text-end">
                      Department
                    </FieldLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select a department"
                      className="col-span-4"
                      items={departmentOptions.map(({ label, value }) => ({
                        label,
                        value,
                      }))}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        className="col-span-4 col-start-3"
                        errors={[fieldState.error]}
                      />
                    )}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="joinDate"
                render={({ field, fieldState }) => (
                  <Field
                    className="grid grid-cols-6 items-center gap-x-4 gap-y-1"
                    data-invalid={fieldState.invalid}
                  >
                    <FieldLabel className="col-span-2 text-end">
                      Join Date
                    </FieldLabel>
                    <Input
                      type="date"
                      className="col-span-4"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        className="col-span-4 col-start-3"
                        errors={[fieldState.error]}
                      />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        </div>
        <DialogFooter>
          <Button type="submit" form="employee-form">
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
