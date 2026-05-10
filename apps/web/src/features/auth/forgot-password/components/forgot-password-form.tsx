import { sleep } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === "" ? "Please enter your email." : undefined),
  }),
});

export function ForgotPasswordForm({ className, ...props }: React.HTMLAttributes<HTMLFormElement>) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true);

    toast.promise(sleep(2000), {
      loading: "Sending email...",
      success: () => {
        setIsLoading(false);
        form.reset();
        return `Email sent to ${data.email}`;
      },
      error: "Error",
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={cn("grid gap-2", className)} {...props}>
      <FieldGroup>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="forgot-password-email">Email</FieldLabel>
              <Input
                {...field}
                id="forgot-password-email"
                aria-invalid={fieldState.invalid}
                placeholder="name@example.com"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <Button className="mt-2" disabled={isLoading}>
        Continue
        {isLoading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
      </Button>
    </form>
  );
}
