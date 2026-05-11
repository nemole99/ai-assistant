import { z } from "zod";
import { useForm } from "@tanstack/react-form";
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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
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

  const { data: departments = [] } = useQuery(
    orpc.department.list.queryOptions(),
  );

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

  const form = useForm({
    defaultValues: isEdit
      ? {
          fullName: currentRow.fullName,
          email: currentRow.email,
          position: currentRow.position,
          departmentId: currentRow.departmentId,
        }
      : { fullName: "", email: "", position: "", departmentId: "" },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: ({ value }) => {
      if (isEdit) {
        updateMutation.mutate({ id: currentRow.id, ...value });
      } else {
        createMutation.mutate(value);
      }
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
            {isEdit ? "Edit Employee" : "Add New Employee"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the employee here. "
              : "Create a new employee here. "}
            Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <form
          id="employee-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="px-0.5"
        >
          <FieldGroup>
            <form.Field
              name="fullName"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field
                    className="grid grid-cols-6 items-center gap-x-4 gap-y-1"
                    data-invalid={isInvalid}
                  >
                    <FieldLabel
                      className="col-span-2 text-end"
                      htmlFor={field.name}
                    >
                      Full Name
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="John Doe"
                      className="col-span-4"
                      autoComplete="off"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError
                        className="col-span-4 col-start-3"
                        errors={field.state.meta.errors}
                      />
                    )}
                  </Field>
                );
              }}
            />
            <form.Field
              name="email"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field
                    className="grid grid-cols-6 items-center gap-x-4 gap-y-1"
                    data-invalid={isInvalid}
                  >
                    <FieldLabel
                      className="col-span-2 text-end"
                      htmlFor={field.name}
                    >
                      Email
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="john.doe@company.com"
                      className="col-span-4"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError
                        className="col-span-4 col-start-3"
                        errors={field.state.meta.errors}
                      />
                    )}
                  </Field>
                );
              }}
            />
            <form.Field
              name="position"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field
                    className="grid grid-cols-6 items-center gap-x-4 gap-y-1"
                    data-invalid={isInvalid}
                  >
                    <FieldLabel
                      className="col-span-2 text-end"
                      htmlFor={field.name}
                    >
                      Position
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Software Engineer"
                      className="col-span-4"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError
                        className="col-span-4 col-start-3"
                        errors={field.state.meta.errors}
                      />
                    )}
                  </Field>
                );
              }}
            />
            <form.Field
              name="departmentId"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field
                    className="grid grid-cols-6 items-center gap-x-4 gap-y-1"
                    data-invalid={isInvalid}
                  >
                    <FieldLabel
                      className="col-span-2 text-end"
                      htmlFor={field.name}
                    >
                      Department
                    </FieldLabel>
                    <SelectDropdown
                      defaultValue={field.state.value}
                      onValueChange={(val) => field.handleChange(val)}
                      placeholder="Select a department"
                      className="col-span-4"
                      items={departments.map(({ id, name }) => ({
                        label: name,
                        value: id,
                      }))}
                    />
                    {isInvalid && (
                      <FieldError
                        className="col-span-4 col-start-3"
                        errors={field.state.meta.errors}
                      />
                    )}
                  </Field>
                );
              }}
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
