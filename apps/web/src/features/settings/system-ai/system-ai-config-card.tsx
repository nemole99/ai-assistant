import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { CheckCircle, XCircle, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { orpc } from "@/lib/orpc";

type Purpose = "pipeline_text" | "pipeline_embedding";

interface SystemAIConfigCardProps {
  purpose: Purpose;
  title: string;
  description: string;
}

const PROVIDER_OPTIONS = [
  { label: "OpenAI / LM Studio", value: "openai" },
  { label: "Anthropic", value: "anthropic" },
  { label: "Google (Gemini)", value: "google" },
  { label: "Ollama (local)", value: "ollama" },
];

const configFormSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string(),
  modelId: z.string().min(1, "Model ID is required."),
  providerType: z.string().min(1, "Provider is required."),
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
      onError: (err) => {
        toast.error(`Failed to save: ${err.message}`);
      },
      onSuccess: () => {
        toast.success(`${title} configuration saved`);
        queryClient.invalidateQueries(
          orpc.systemAiConfig.get.queryOptions({ input: { purpose } })
        );
        setEditing(false);
      },
    })
  );

  const deleteMutation = useMutation(
    orpc.systemAiConfig.delete.mutationOptions({
      onError: (err) => {
        toast.error(`Failed to delete: ${err.message}`);
      },
      onSuccess: () => {
        toast.success(`${title} configuration removed`);
        queryClient.invalidateQueries(
          orpc.systemAiConfig.get.queryOptions({ input: { purpose } })
        );
        setEditing(false);
      },
    })
  );

  const testMutation = useMutation(
    orpc.systemAiConfig.testConnection.mutationOptions({
      onError: (err) => {
        toast.error(`Test failed: ${err.message}`);
      },
      onSuccess: (result) => {
        if (result.ok) {
          toast.success("Connection successful!");
        } else {
          toast.error(`Connection failed: ${result.error}`);
        }
      },
    })
  );

  const form = useForm({
    defaultValues: {
      apiKey: "",
      baseUrl: config?.baseUrl ?? "",
      modelId: config?.modelId ?? "",
      providerType: config?.providerType ?? "openai",
    } satisfies ConfigFormValues,
    onSubmit: ({ value }) => {
      upsertMutation.mutate({
        apiKey:
          value.apiKey ||
          (value.providerType === "ollama" ? "local" : "KEEP_EXISTING"),
        baseUrl:
          value.providerType === "ollama"
            ? value.baseUrl || "http://localhost:11434/"
            : null,
        modelId: value.modelId,
        providerType: value.providerType,
        purpose,
      });
    },
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
  });

  const handleStartEdit = () => {
    form.reset({
      apiKey: "",
      baseUrl: config?.baseUrl ?? "",
      modelId: config?.modelId ?? "",
      providerType: config?.providerType ?? "openai",
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
          {config.baseUrl && (
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
                              "http://localhost:11434/"
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
                        field.state.meta.isTouched && !field.state.meta.isValid;
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
                ) : null
              }
            />

            <form.Subscribe
              selector={(state) => state.values.providerType}
              children={(providerType) => (
                <form.Field
                  name="baseUrl"
                  children={(field) => (
                    <Field>
                      <FieldLabel>
                        Base URL{" "}
                        <span className="text-muted-foreground text-xs">
                          (optional, for custom endpoints like LM Studio)
                        </span>
                      </FieldLabel>
                      <Input
                        id={field.name}
                        placeholder={
                          providerType === "ollama"
                            ? "http://localhost:11434"
                            : "https://api.openai.com/v1"
                        }
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </Field>
                  )}
                />
              )}
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
