import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { showSubmittedData } from "@/lib/show-submitted-data";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";
import { Switch } from "@workspace/ui/components/switch";

const notificationsFormSchema = z.object({
  type: z.enum(["all", "mentions", "none"], {
    error: (iss) => (iss.input === undefined ? "Please select a notification type." : undefined),
  }),
  mobile: z.boolean().default(false).optional(),
  communication_emails: z.boolean().default(false).optional(),
  social_emails: z.boolean().default(false).optional(),
  marketing_emails: z.boolean().default(false).optional(),
  security_emails: z.boolean(),
});

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

// This can come from your database or API.
const defaultValues: Partial<NotificationsFormValues> = {
  communication_emails: false,
  marketing_emails: false,
  social_emails: true,
  security_emails: true,
};

export function NotificationsForm() {
  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues,
  });

  return (
    <form onSubmit={form.handleSubmit((data) => showSubmittedData(data))} className="space-y-8">
      <FieldGroup>
        <Controller
          name="type"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="relative space-y-3">
              <FieldLabel>Notify me about...</FieldLabel>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col gap-2"
              >
                <label className="flex items-center gap-2">
                  <RadioGroupItem value="all" />
                  <span className="text-sm font-normal">All new messages</span>
                </label>
                <label className="flex items-center gap-2">
                  <RadioGroupItem value="mentions" />
                  <span className="text-sm font-normal">Direct messages and mentions</span>
                </label>
                <label className="flex items-center gap-2">
                  <RadioGroupItem value="none" />
                  <span className="text-sm font-normal">Nothing</span>
                </label>
              </RadioGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <div className="relative">
        <h3 className="mb-4 text-lg font-medium">Email Notifications</h3>
        <div className="space-y-4">
          <Controller
            name="communication_emails"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                orientation="horizontal"
                className="justify-between rounded-lg border p-4"
              >
                <div className="space-y-0.5">
                  <FieldLabel className="text-base">Communication emails</FieldLabel>
                  <FieldDescription>Receive emails about your account activity.</FieldDescription>
                </div>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />
          <Controller
            name="marketing_emails"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                orientation="horizontal"
                className="justify-between rounded-lg border p-4"
              >
                <div className="space-y-0.5">
                  <FieldLabel className="text-base">Marketing emails</FieldLabel>
                  <FieldDescription>
                    Receive emails about new products, features, and more.
                  </FieldDescription>
                </div>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />
          <Controller
            name="social_emails"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                orientation="horizontal"
                className="justify-between rounded-lg border p-4"
              >
                <div className="space-y-0.5">
                  <FieldLabel className="text-base">Social emails</FieldLabel>
                  <FieldDescription>
                    Receive emails for friend requests, follows, and more.
                  </FieldDescription>
                </div>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />
          <Controller
            name="security_emails"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                orientation="horizontal"
                className="justify-between rounded-lg border p-4"
              >
                <div className="space-y-0.5">
                  <FieldLabel className="text-base">Security emails</FieldLabel>
                  <FieldDescription>
                    Receive emails about your account activity and security.
                  </FieldDescription>
                </div>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled
                  aria-readonly
                />
              </Field>
            )}
          />
        </div>
      </div>
      <Controller
        name="mobile"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field
            data-invalid={fieldState.invalid}
            orientation="horizontal"
            className="relative items-start"
          >
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            <div className="space-y-1 leading-none">
              <FieldLabel>Use different settings for my mobile devices</FieldLabel>
              <FieldDescription>
                You can manage your mobile notifications in the{" "}
                <Link
                  to="/settings"
                  className="underline decoration-dashed underline-offset-4 hover:decoration-solid"
                >
                  mobile settings
                </Link>{" "}
                page.
              </FieldDescription>
            </div>
          </Field>
        )}
      />
      <Button type="submit">Update notifications</Button>
    </form>
  );
}
