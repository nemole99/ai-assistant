import { sleep } from "@/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { useForm } from "@tanstack/react-form";
import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export function ForgotPasswordForm({ className, ...props }: React.HTMLAttributes<HTMLFormElement>) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: { email: "" },
    validators: {
      onSubmit: z.object({
        email: z.email({
          error: (iss) => (iss.input === "" ? "Please enter your email." : undefined),
        }),
      }),
    },
    onSubmit: ({ value }) => {
      setIsLoading(true);
      toast.promise(sleep(2000), {
        loading: "Sending email...",
        success: () => {
          setIsLoading(false);
          form.reset();
          return `Email sent to ${value.email}`;
        },
        error: "Error",
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className={cn("grid gap-2", className)}
      {...props}
    >
      <FieldGroup>
        <form.Field
          name="email"
          children={(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="name@example.com"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
      </FieldGroup>
      <Button className="mt-2" disabled={isLoading}>
        Continue
        {isLoading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
      </Button>
    </form>
  );
}
