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
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { SelectDropdown } from "@/components/select-dropdown";
import { orpc } from "@/lib/orpc";
import { type Project } from "../data/schema";

const formSchema = z.object({
  name: z.string().min(1, "Name is required."),
  description: z.string(),
  status: z.enum(["ACTIVE", "COMPLETED"]),
  managerId: z.string(),
});

type ProjectsActionDialogProps = {
  currentRow?: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProjectsActionDialog({
  currentRow,
  open,
  onOpenChange,
}: ProjectsActionDialogProps) {
  const isEdit = !!currentRow;
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    ...orpc.employee.list.queryOptions(),
    enabled: open,
  });

  const createMutation = useMutation(
    orpc.project.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.project.list.queryOptions());
        toast.success("Project created successfully.");
        form.reset();
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    orpc.project.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.project.list.queryOptions());
        toast.success("Project updated successfully.");
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
          name: currentRow.name,
          description: currentRow.description ?? "",
          status: currentRow.status as "ACTIVE" | "COMPLETED",
          managerId: currentRow.managerId ?? "",
        }
      : { name: "", description: "", status: "ACTIVE" as const, managerId: "" },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: ({ value }) => {
      const payload = {
        ...value,
        managerId: value.managerId || undefined,
      };
      if (isEdit) {
        updateMutation.mutate({ id: currentRow.id, ...payload });
      } else {
        createMutation.mutate(payload);
      }
    },
  });

  const employeeOptions = employees.map((e) => ({
    label: e.fullName,
    value: e.id,
  }));

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
          <DialogTitle>{isEdit ? "Edit Project" : "Add New Project"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the project here. " : "Create a new project here. "}
            Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <form
          id="project-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field
              name="name"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., CRM Platform"
                      autoComplete="off"
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            />
            <form.Field
              name="description"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Brief description of the project..."
                      className="resize-none"
                      rows={3}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            />
            <form.Field
              name="status"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Status</FieldLabel>
                  <SelectDropdown
                    defaultValue={field.state.value}
                    onValueChange={(val) => field.handleChange(val as "ACTIVE" | "COMPLETED")}
                    placeholder="Select status"
                    items={[
                      { label: "Active", value: "ACTIVE" },
                      { label: "Completed", value: "COMPLETED" },
                    ]}
                  />
                </Field>
              )}
            />
            <form.Field
              name="managerId"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Manager</FieldLabel>
                  <SelectDropdown
                    defaultValue={field.state.value}
                    onValueChange={(val) => field.handleChange(val)}
                    placeholder="Select manager (optional)"
                    items={employeeOptions}
                  />
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="project-form" disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
