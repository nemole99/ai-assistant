import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { orpc } from "@/lib/orpc";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Badge } from "@workspace/ui/components/badge";
import { toast } from "sonner";
import { useState } from "react";
import { CheckCircle, XCircle, Loader2, Trash2 } from "lucide-react";

type Purpose = "pipeline_text" | "pipeline_embedding";

interface SystemAIConfigCardProps {
  purpose: Purpose;
  title: string;
  description: string;
}

const PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google (Gemini)" },
  { value: "ollama", label: "Ollama (local)" },
];

const configFormSchema = z.object({
  providerType: z.string().min(1, "Provider is required."),
  modelId: z.string().min(1, "Model ID is required."),
  apiKey: z.string(),
  baseUrl: z.string(),
});

type ConfigFormValues = z.infer<typeof configFormSchema>;

export function SystemAIConfigCard({
  purpose,
  title,
  description,
}: SystemAIConfigCardProps) {
  const queryClient = useQueryClient();

  const { data: config, isPending } = useQuery({
    ...orpc.systemAiConfig.get.queryOptions({ input: { purpose } }),
  });

  const [editing, setEditing] = useState(false);

  const upsertMutation = useMutation(
    orpc.systemAiConfig.upsert.mutationOptions({
      onSuccess: () => {
        toast.success(`${title} configuration saved`);
        queryClient.invalidateQueries(
          orpc.systemAiConfig.get.queryOptions({ input: { purpose } }),
        );
        setEditing(false);
      },
      onError: (err) => {
        toast.error(`Failed to save: ${err.message}`);
      },
    }),
  );

  const deleteMutation = useMutation(
    orpc.systemAiConfig.delete.mutationOptions({
      onSuccess: () => {
        toast.success(`${title} configuration removed`);
        queryClient.invalidateQueries(
          orpc.systemAiConfig.get.queryOptions({ input: { purpose } }),
        );
        setEditing(false);
      },
      onError: (err) => {
        toast.error(`Failed to delete: ${err.message}`);
      },
    }),
  );

  const testMutation = useMutation(
    orpc.systemAiConfig.testConnection.mutationOptions({
      onSuccess: (result) => {
        if (result.ok) {
          toast.success("Connection successful!");
        } else {
          toast.error(`Connection failed: ${result.error}`);
        }
      },
      onError: (err) => {
        toast.error(`Test failed: ${err.message}`);
      },
    }),
  );

  const form = useForm({
    defaultValues: {
      providerType: config?.providerType ?? "openai",
      modelId: config?.modelId ?? "",
      apiKey: "",
      baseUrl: config?.baseUrl ?? "",
    } satisfies ConfigFormValues,
    validators: {
      onSubmit: configFormSchema.superRefine((data, ctx) => {
        if (!data.apiKey && !config && data.providerType !== "ollama") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "API key is required for new configuration.",
            path: ["apiKey"],
          });
        }
      }),
    },
    onSubmit: async ({ value }) => {
      upsertMutation.mutate({
        purpose,
        providerType: value.providerType,
        apiKey:
          value.apiKey ||
          (value.providerType === "ollama" ? "local" : "KEEP_EXISTING"),
        modelId: value.modelId,
        baseUrl:
          value.providerType === "ollama"
            ? value.baseUrl || "http://localhost:11434/"
            : null,
      });
    },
  });

  const handleStartEdit = () => {
    form.reset({
      providerType: config?.providerType ?? "openai",
      modelId: config?.modelId ?? "",
      apiKey: "",
      baseUrl: config?.baseUrl ?? "",
    });
    setEditing(true);
  };

  if (isPending) {
    return (
      <div className="border p-4">
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const isConfigured = !!config;

  return (
    <div className="border p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{title}</h3>
            {isConfigured ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle size={11} />
                Configured
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle size={11} />
                Not configured
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {isConfigured && !editing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testMutation.mutate({ purpose })}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Test"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate({ purpose })}
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
      </div>

      {isConfigured && !editing && (
        <div className="text-sm space-y-1 text-muted-foreground bg-muted/40 rounded-md p-3">
          <div>
            <span className="font-medium text-foreground">Provider:</span>{" "}
            {config.providerType}
          </div>
          <div>
            <span className="font-medium text-foreground">Model:</span>{" "}
            {config.modelId}
          </div>
          <div>
            <span className="font-medium text-foreground">API Key:</span>{" "}
            {config.apiKeyMasked}
          </div>
          {config.providerType === "ollama" && config.baseUrl && (
            <div>
              <span className="font-medium text-foreground">Base URL:</span>{" "}
              {config.baseUrl}
            </div>
          )}
        </div>
      )}

      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-3"
        >
          <FieldGroup>
            <form.Field
              name="providerType"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel>Provider</FieldLabel>
                    <Select
                      items={PROVIDER_OPTIONS}
                      value={field.state.value}
                      onValueChange={(v) => {
                        if (v) {
                          field.handleChange(v);
                          if (
                            v === "ollama" &&
                            !form.getFieldValue("baseUrl")
                          ) {
                            form.setFieldValue(
                              "baseUrl",
                              "http://localhost:11434/",
                            );
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            <form.Field
              name="modelId"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel>Model ID</FieldLabel>
                    <Input
                      id={field.name}
                      placeholder={
                        purpose === "pipeline_text"
                          ? "e.g. gpt-4o-mini, gemini-2.0-flash"
                          : "e.g. gemini-embedding-001, text-embedding-004"
                      }
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />

            <form.Subscribe
              selector={(state) => state.values.providerType}
              children={(providerType) =>
                providerType !== "ollama" ? (
                  <form.Field
                    name="apiKey"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched &&
                        !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel>
                            API Key
                            {isConfigured && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (leave blank to keep existing:{" "}
                                {config.apiKeyMasked})
                              </span>
                            )}
                          </FieldLabel>
                          <Input
                            id={field.name}
                            type="password"
                            placeholder={
                              isConfigured
                                ? "Leave blank to keep existing key"
                                : "Enter API key"
                            }
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) =>
                              field.handleChange(e.target.value)
                            }
                            aria-invalid={isInvalid}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  />
                ) : null
              }
            />

            <form.Subscribe
              selector={(state) => state.values.providerType}
              children={(providerType) =>
                providerType === "ollama" ? (
                  <form.Field
                    name="baseUrl"
                    children={(field) => (
                      <Field>
                        <FieldLabel>
                          Base URL{" "}
                          <span className="text-muted-foreground text-xs">
                            (optional)
                          </span>
                        </FieldLabel>
                        <Input
                          id={field.name}
                          placeholder="http://localhost:11434"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  />
                ) : null
              }
            />
          </FieldGroup>

          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
            children={({ canSubmit, isSubmitting }) => (
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    !canSubmit || isSubmitting || upsertMutation.isPending
                  }
                >
                  {upsertMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin mr-1" />
                  ) : null}
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          />
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={handleStartEdit}>
          {isConfigured ? "Edit" : "Configure"}
        </Button>
      )}
    </div>
  );
}
