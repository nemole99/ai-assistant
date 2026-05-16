import { env } from "@workspace/env/server";

export async function resolveOllamaModelId(modelId: string): Promise<string> {
  if (!env.OLLAMA_BASE_URL) return modelId;

  try {
    const tagsRes = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`);
    if (tagsRes.ok) {
      const tags = (await tagsRes.json()) as { models?: { name?: string }[] };
      if (tags.models && Array.isArray(tags.models)) {
        const modelNames = tags.models
          .map((m) => m.name)
          .filter((name): name is string => Boolean(name));

        if (modelNames.includes(modelId)) return modelId;

        const prefixedMatches = modelNames.filter((name) => name.startsWith(`${modelId}:`));

        if (prefixedMatches.length > 0) {
          const latestMatch = prefixedMatches.find((name) => name.endsWith(":latest"));
          return latestMatch ?? prefixedMatches[0]!;
        }
      }
    }
  } catch {
    // Fallthrough to try /v1/models
  }

  try {
    const modelsRes = await fetch(`${env.OLLAMA_BASE_URL}/v1/models`);
    if (modelsRes.ok) {
      const data = (await modelsRes.json()) as { data?: { id?: string }[] };
      if (data.data && Array.isArray(data.data)) {
        const modelNames = data.data
          .map((m) => m.id)
          .filter((id): id is string => Boolean(id));

        if (modelNames.includes(modelId)) return modelId;
      }
    }
  } catch {
    // Ignored
  }

  return modelId;
}
