import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
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

import { SelectDropdown } from "@/components/select-dropdown";
import { orpc } from "@/lib/orpc";

const formSchema = z.object({
  description: z.string().min(1, "Description is required."),
  priority: z.enum(["low", "medium", "high"]),
  title: z.string().min(1, "Title is required."),
  type: z.enum(["bug", "feature", "other"]),
});

interface IssueSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueSubmitDialog({
  open,
  onOpenChange,
}: IssueSubmitDialogProps) {
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    orpc.issue.create.mutationOptions({
      onError: (err) => toast.error(err.message),
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.issue.list.queryOptions());
        toast.success("Issue reported successfully.");
        form.reset();
        onOpenChange(false);
      },
    })
  );

  const form = useForm({
    defaultValues: {
      description: "",
      priority: "medium" as "low" | "medium" | "high",
      title: "",
      type: "bug" as "bug" | "feature" | "other",
    },
    onSubmit: ({ value }) => createMutation.mutate(value),
    validators: { onSubmit: formSchema },
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
          <DialogTitle>Report an Issue</DialogTitle>
        </DialogHeader>
        <form
          id="issue-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field name="title">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                    <Input
                      id={field.name}
                      autoComplete="off"
                      placeholder="Brief summary of the issue"
                      value={field.state.value}
                      aria-invalid={isInvalid}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="type">
                {(field) => (
                  <Field>
                    <FieldLabel>Type</FieldLabel>
                    <SelectDropdown
                      defaultValue={field.state.value}
                      items={[
                        { label: "Bug Report", value: "bug" },
                        { label: "Feature Request", value: "feature" },
                        { label: "Other", value: "other" },
                      ]}
                      placeholder="Select type"
                      onValueChange={(val) =>
                        field.handleChange(val as typeof field.state.value)
                      }
                    />
                  </Field>
                )}
              </form.Field>

              <form.Field name="priority">
                {(field) => (
                  <Field>
                    <FieldLabel>Priority</FieldLabel>
                    <SelectDropdown
                      defaultValue={field.state.value}
                      items={[
                        { label: "Low", value: "low" },
                        { label: "Medium", value: "medium" },
                        { label: "High", value: "high" },
                      ]}
                      placeholder="Select priority"
                      onValueChange={(val) =>
                        field.handleChange(val as typeof field.state.value)
                      }
                    />
                  </Field>
                )}
              </form.Field>
            </div>

            <form.Field name="description">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                    <Textarea
                      id={field.name}
                      className="resize-none"
                      placeholder="Describe the issue in detail..."
                      rows={4}
                      value={field.state.value}
                      aria-invalid={isInvalid}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={createMutation.isPending}
            form="issue-form"
            type="submit"
          >
            {createMutation.isPending ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
