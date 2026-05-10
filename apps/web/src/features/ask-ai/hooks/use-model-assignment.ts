import { useCallback, useEffect, useState } from "react";
import { orpc } from "@/lib/orpc";
import { useQuery, useMutation } from "@tanstack/react-query";

export interface CopilotModel {
  id: string;
  name: string;
  vendor: string;
}

export function useModelAssignment(providerId: string | null) {
  const { data: assignment } = useQuery(
    orpc.aiModelAssignment.get.queryOptions({ input: { purpose: "chat" } }),
  );

  const { data: models = [] } = useQuery({
    ...orpc.aiProvider.listCopilotModels.queryOptions({ input: undefined }),
    enabled: providerId !== null,
  });

  const [selectedModelId, setSelectedModelIdState] = useState<string>("");

  // Initialise from saved assignment or first available model
  useEffect(() => {
    if (selectedModelId) return;
    if (assignment?.model) {
      setSelectedModelIdState(assignment.model);
    } else if (models.length > 0 && models[0]) {
      setSelectedModelIdState(models[0].id);
    }
  }, [assignment, models, selectedModelId]);

  const { mutate: persistAssignment } = useMutation(orpc.aiModelAssignment.set.mutationOptions());

  const setSelectedModel = useCallback(
    (modelId: string) => {
      setSelectedModelIdState(modelId);
      if (providerId) {
        persistAssignment({
          purpose: "chat",
          model: modelId,
          providerId,
        });
      }
    },
    [providerId, persistAssignment],
  );

  const selectedModel = models.find((m) => m.id === selectedModelId) ?? models[0] ?? null;

  return {
    models,
    selectedModel,
    selectedModelId: selectedModel?.id ?? "",
    setSelectedModel,
  };
}
