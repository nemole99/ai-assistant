import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { Separator } from "@workspace/ui/components/separator";
import { GitHubCopilotCard } from "./github-copilot-card";
import { ComingSoonCard } from "./coming-soon-card";

export function AIProvidersPanel() {
  const queryClient = useQueryClient();

  const { data: providers = [], isPending } = useQuery({
    ...orpc.aiProvider.list.queryOptions(),
    refetchOnWindowFocus: false,
  });

  const disconnectMutation = useMutation(
    orpc.aiProvider.disconnect.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.aiProvider.list.queryOptions());
      },
    }),
  );

  const connectedCopilot = providers.find((p) => p.provider === "github_copilot");

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">Connected Providers</h4>
        <div className="space-y-3">
          <GitHubCopilotCard
            connected={connectedCopilot}
            isPending={isPending}
            onDisconnect={() => disconnectMutation.mutate({ provider: "github_copilot" })}
            isDisconnecting={disconnectMutation.isPending}
            onConnectSuccess={() =>
              queryClient.invalidateQueries(orpc.aiProvider.list.queryOptions())
            }
          />
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-medium mb-3">Coming Soon</h4>
        <div className="space-y-3">
          <ComingSoonCard name="OpenAI" description="GPT-4o, o3, text-embedding-3" />
          <ComingSoonCard name="Google" description="Gemini 2.5 Pro, text-embedding-004" />
          <ComingSoonCard name="Anthropic" description="Claude Sonnet, Haiku" />
        </div>
      </div>
    </div>
  );
}
