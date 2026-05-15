import { createOpenAI } from "@ai-sdk/openai";
import { getCopilotSession, invalidateCopilotSession } from "@workspace/api/copilot-session-cache";
import { auth } from "@workspace/auth";
import { env } from "@workspace/env/server";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { Hono } from "hono";
import { resolveOllamaModelId } from "../utils/ollama";

const SYSTEM_PROMPT = `You are an AI assistant for an internal company platform (~50-person software company).
Your primary purpose is to help employees understand the company's business, processes, policies, and domain knowledge.
Be concise, professional, and accurate. If you don't know something specific to the company, say so clearly.
When answering in Vietnamese, respond in Vietnamese. When answering in English, respond in English — always match the language of the user's message.`;

export const aiRoutes = new Hono();

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

  try {
    const result = streamText({
      model: languageModel,
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch {
    if (provider === "copilot") {
      invalidateCopilotSession(userId);
      return c.json({ error: "COPILOT_NOT_CONNECTED" }, 403);
    }
    return c.json({ error: "AI_PROVIDER_ERROR" }, 500);
  }
});
