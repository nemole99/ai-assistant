import { createOpenAI } from "@ai-sdk/openai";
import { getCopilotSession, invalidateCopilotSession } from "@workspace/api/copilot-session-cache";
import { auth } from "@workspace/auth";
import { db } from "@workspace/db";
import { systemAiConfig, wikiPage, wikiPageChunk } from "@workspace/db/schema/auth";
import { decrypt } from "@workspace/db/crypto";
import { env } from "@workspace/env/server";
import { cosineDistance, desc, eq, sql } from "drizzle-orm";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { Hono } from "hono";
import { resolveOllamaModelId } from "../utils/ollama";

const BASE_SYSTEM_PROMPT = `You are an AI assistant for an internal company platform (~50-person software company).
Your primary purpose is to help employees understand the company's business, processes, policies, and domain knowledge.
Be concise, professional, and accurate. If you don't know something specific to the company, say so clearly.
When answering in Vietnamese, respond in Vietnamese. When answering in English, respond in English — always match the language of the user's message.`;

export const aiRoutes = new Hono();

interface WikiChunk {
  chunkId: string;
  content: string;
  similarity: number;
  wikiPageId: string;
  wikiPageTitle: string;
  wikiPageSlug: string;
}

async function embedQuery(query: string): Promise<number[] | null> {
  const [config] = await db
    .select()
    .from(systemAiConfig)
    .where(eq(systemAiConfig.purpose, "pipeline_embedding"))
    .limit(1);

  if (!config) return null;

  const apiKey = decrypt(config.apiKey);

  try {
    if (config.providerType === "openai") {
      const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
      const res = await fetch(`${baseUrl}/embeddings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.modelId, input: query }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { data: { embedding: number[] }[] };
      return data.data[0]?.embedding ?? null;
    }

    if (config.providerType === "ollama") {
      const baseUrl = config.baseUrl ?? "http://localhost:11434";
      const res = await fetch(`${baseUrl}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.modelId, input: query }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { embeddings: number[][] };
      return data.embeddings[0] ?? null;
    }

    if (config.providerType === "google") {
      const baseUrl = config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
      const model = config.modelId.startsWith("models/")
        ? config.modelId
        : `models/${config.modelId}`;
      const res = await fetch(`${baseUrl}/${model}:embedContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          content: { parts: [{ text: query }] },
          outputDimensionality: 1536,
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { embedding: { values: number[] } };
      return data.embedding.values ?? null;
    }
  } catch {
    // Graceful degradation — return null to skip RAG
  }

  return null;
}

async function searchWiki(query: string, limit = 5): Promise<WikiChunk[]> {
  const vector = await embedQuery(query);
  if (!vector) return [];

  try {
    const similarity = sql<number>`1 - (${cosineDistance(wikiPageChunk.embedding, vector)})`;

    const rows = await db
      .select({
        chunkId: wikiPageChunk.id,
        content: wikiPageChunk.content,
        similarity,
        wikiPageId: wikiPage.id,
        wikiPageTitle: wikiPage.title,
        wikiPageSlug: wikiPage.slug,
      })
      .from(wikiPageChunk)
      .innerJoin(wikiPage, eq(wikiPageChunk.wikiPageId, wikiPage.id))
      .orderBy(desc(similarity))
      .limit(limit);

    return rows.filter((r) => r.similarity > 0.5);
  } catch {
    return [];
  }
}

function buildSystemPromptWithContext(chunks: WikiChunk[]): {
  systemPrompt: string;
  citations: { id: string; title: string; slug: string }[];
} {
  if (chunks.length === 0) {
    return { systemPrompt: BASE_SYSTEM_PROMPT, citations: [] };
  }

  const uniquePages = new Map<string, { id: string; title: string; slug: string }>();
  for (const chunk of chunks) {
    uniquePages.set(chunk.wikiPageId, {
      id: chunk.wikiPageId,
      title: chunk.wikiPageTitle,
      slug: chunk.wikiPageSlug,
    });
  }

  const contextBlocks = chunks.map((c) => `[${c.wikiPageTitle}]\n${c.content}`).join("\n\n---\n\n");

  const systemPrompt = `${BASE_SYSTEM_PROMPT}

## Company Knowledge Base

The following excerpts from the company wiki are relevant to the user's question. Use this information to give accurate, company-specific answers. Cite your sources using the format [WikiPage Title] when you use information from the provided context.

${contextBlocks}`;

  return { systemPrompt, citations: Array.from(uniquePages.values()) };
}

aiRoutes.post("/chat", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = session.user.id;
  const body = await c.req.json<{ messages: UIMessage[]; model: string }>();
  const { messages, model } = body;

  if (!model || !messages) {
    return c.json({ error: "Missing messages or model" }, 400);
  }

  const [provider, modelId] = model.split(":");
  let languageModel;

  if (provider === "ollama") {
    if (!env.OLLAMA_BASE_URL) {
      return c.json({ error: "Ollama is not configured" }, 500);
    }
    const resolvedModelId = await resolveOllamaModelId(modelId!);
    const ollamaProvider = createOpenAI({
      baseURL: `${env.OLLAMA_BASE_URL}/v1`,
      apiKey: "ollama",
    });
    languageModel = ollamaProvider.chat(resolvedModelId);
  } else if (provider === "copilot") {
    let copilotSession: Awaited<ReturnType<typeof getCopilotSession>>;
    try {
      copilotSession = await getCopilotSession(userId);
    } catch {
      return c.json({ error: "COPILOT_NOT_CONNECTED" }, 403);
    }

    const copilotProvider = createOpenAI({
      apiKey: copilotSession.token,
      baseURL: copilotSession.endpoint,
      headers: {
        "Copilot-Integration-Id": "vscode-chat",
        "Editor-Version": "vscode/1.99.0",
      },
    });
    languageModel = copilotProvider.chat(modelId!);
  } else {
    return c.json({ error: "Unknown provider" }, 400);
  }

  // RAG: search wiki for the last user message
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const lastUserText = lastUserMessage
    ? (lastUserMessage.parts ?? [])
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ")
    : "";

  const wikiChunks = lastUserText ? await searchWiki(lastUserText) : [];
  const { systemPrompt, citations } = buildSystemPromptWithContext(wikiChunks);

  try {
    const result = streamText({
      model: languageModel,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    const response = result.toUIMessageStreamResponse();

    // Attach citations as a response header for the frontend to consume
    if (citations.length > 0) {
      response.headers.set("X-Wiki-Citations", JSON.stringify(citations));
    }

    return response;
  } catch {
    if (provider === "copilot") {
      invalidateCopilotSession(userId);
      return c.json({ error: "COPILOT_NOT_CONNECTED" }, 403);
    }
    return c.json({ error: "AI_PROVIDER_ERROR" }, 500);
  }
});
