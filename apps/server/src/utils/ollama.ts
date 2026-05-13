import { env } from "@workspace/env/server";

export async function resolveOllamaModelId(modelId: string): Promise<string> {
  if (!env.OLLAMA_BASE_URL) return modelId;

  try {
    const tagsRes = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`);
    if (!tagsRes.ok) return modelId;

    const tags = (await tagsRes.json()) as { models?: { name?: string }[] };
    const modelNames = (tags.models ?? [])
      .map((m) => m.name)
      .filter((name): name is string => Boolean(name));

    if (modelNames.includes(modelId)) return modelId;

    const prefixedMatches = modelNames.filter((name) =>
      name.startsWith(`${modelId}:`),
    );

    if (prefixedMatches.length === 0) return modelId;

    const latestMatch = prefixedMatches.find((name) =>
      name.endsWith(":latest"),
    );
    return latestMatch ?? prefixedMatches[0]!;
  } catch {
    return modelId;
  }
}
