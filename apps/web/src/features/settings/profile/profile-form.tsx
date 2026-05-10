import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";
import { DatePicker } from "@/components/date-picker";
import { orpc } from "@/lib/orpc";
import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";

const profileFormSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters."),
  position: z.string().min(1, "Position is required."),
  phone: z.string(),
  joinDate: z.string(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileForm() {
  const queryClient = useQueryClient();

  const { data: employee, isPending } = useQuery(
    orpc.employee.getSelf.queryOptions(),
  );

  const mutation = useMutation(
    orpc.employee.updateSelf.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.employee.getSelf.queryOptions());
        toast.success("Profile updated successfully.");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const form = useForm({
    defaultValues: {
      fullName: employee?.fullName ?? "",
      position: employee?.position ?? "",
      phone: employee?.phone ?? "",
      joinDate: employee?.joinDate ?? "",
    } satisfies ProfileFormValues,
    validators: { onSubmit: profileFormSchema },
    onSubmit: async ({ value }) => {
      mutation.mutate({
        fullName: value.fullName,
        position: value.position,
        phone: value.phone || null,
        joinDate: value.joinDate || undefined,
      });
    },
  });

  if (isPending) {
    return <div className="text-muted-foreground text-sm">Loading...</div>;
  }

  if (!employee) {
    return (
      <div className="text-muted-foreground text-sm">
        You don't have an employee record linked to your account.
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-8"
    >
      <FieldGroup>
        <form.Field
          name="fullName"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Your full name"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />

        <Field>
          <FieldLabel>Email</FieldLabel>
          <Input value={employee.email} disabled aria-disabled="true" />
          <FieldDescription>
            Email can only be changed by an administrator.
          </FieldDescription>
        </Field>

        <form.Field
          name="position"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Position</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Your position"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />

        <Field>
          <FieldLabel>Department</FieldLabel>
          <Input
            value={employee.departmentName ?? ""}
            disabled
            aria-disabled="true"
          />
        </Field>

        <form.Field
          name="phone"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value ?? ""}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="+84 xxx xxx xxx"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />

        <form.Field
          name="joinDate"
          children={(field) => {
            const dateValue = field.state.value
              ? new Date(field.state.value + "T00:00:00")
              : undefined;
            return (
              <Field>
                <FieldLabel>Join Date</FieldLabel>
                <DatePicker
                  selected={dateValue}
                  onSelect={(date) =>
                    field.handleChange(date ? format(date, "yyyy-MM-dd") : "")
                  }
                  placeholder="Pick a date"
                />
              </Field>
            );
          }}
        />
      </FieldGroup>

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
        children={({ canSubmit, isSubmitting }) => (
          <Button
            type="submit"
            disabled={!canSubmit || isSubmitting || mutation.isPending}
          >
            {isSubmitting || mutation.isPending
              ? "Saving..."
              : "Update profile"}
          </Button>
        )}
      />
    </form>
  );
}
