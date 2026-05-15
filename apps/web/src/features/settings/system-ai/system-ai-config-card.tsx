import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
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

export function SystemAIConfigCard({ purpose, title, description }: SystemAIConfigCardProps) {
  const queryClient = useQueryClient();

  const { data: config, isPending } = useQuery({
    ...orpc.systemAiConfig.get.queryOptions({ input: { purpose } }),
  });

  const [providerType, setProviderType] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [editing, setEditing] = useState(false);

  const upsertMutation = useMutation(
    orpc.systemAiConfig.upsert.mutationOptions({
      onSuccess: () => {
        toast.success(`${title} configuration saved`);
        queryClient.invalidateQueries(orpc.systemAiConfig.get.queryOptions({ input: { purpose } }));
        setEditing(false);
        setApiKey("");
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
        queryClient.invalidateQueries(orpc.systemAiConfig.get.queryOptions({ input: { purpose } }));
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

  const handleStartEdit = () => {
    setProviderType(config?.providerType ?? "openai");
    setModelId(config?.modelId ?? "");
    setBaseUrl(config?.baseUrl ?? "");
    setApiKey("");
    setEditing(true);
  };

  const handleSave = () => {
    if (!providerType || !modelId) {
      toast.error("Provider and model are required");
      return;
    }
    if (!apiKey && !config) {
      toast.error("API key is required for new configuration");
      return;
    }
    upsertMutation.mutate({
      purpose,
      providerType,
      apiKey: apiKey || "KEEP_EXISTING",
      modelId,
      baseUrl: baseUrl || null,
    });
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
                {testMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : "Test"}
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
            <span className="font-medium text-foreground">Provider:</span> {config.providerType}
          </div>
          <div>
            <span className="font-medium text-foreground">Model:</span> {config.modelId}
          </div>
          <div>
            <span className="font-medium text-foreground">API Key:</span> {config.apiKeyMasked}
          </div>
          {config.baseUrl && (
            <div>
              <span className="font-medium text-foreground">Base URL:</span> {config.baseUrl}
            </div>
          )}
        </div>
      )}

      {editing ? (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Provider</Label>
            <Select
              items={PROVIDER_OPTIONS}
              value={providerType}
              onValueChange={(v) => {
                if (v) setProviderType(v);
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
          </div>

          <div className="grid gap-2">
            <Label>Model ID</Label>
            <Input
              placeholder={
                purpose === "pipeline_text"
                  ? "e.g. gpt-4o-mini, gemini-2.0-flash"
                  : "e.g. gemini-embedding-001, text-embedding-004"
              }
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>
              API Key
              {isConfigured && (
                <span className="text-xs text-muted-foreground ml-2">
                  (leave blank to keep existing: {config.apiKeyMasked})
                </span>
              )}
            </Label>
            <Input
              type="password"
              placeholder={isConfigured ? "Leave blank to keep existing key" : "Enter API key"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          {(providerType === "ollama" || providerType === "openai") && (
            <div className="grid gap-2">
              <Label>
                Base URL <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                placeholder={
                  providerType === "ollama" ? "http://localhost:11434" : "https://api.openai.com/v1"
                }
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? (
                <Loader2 size={14} className="animate-spin mr-1" />
              ) : null}
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={handleStartEdit}>
          {isConfigured ? "Edit" : "Configure"}
        </Button>
      )}
    </div>
  );
}
