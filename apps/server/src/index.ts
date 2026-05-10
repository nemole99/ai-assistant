import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@workspace/api/context";
import { appRouter } from "@workspace/api/routers/index";
import { getCopilotSession, invalidateCopilotSession } from "@workspace/api/copilot-session-cache";
import { auth } from "@workspace/auth";
import { env } from "@workspace/env/server";
import { streamText, convertToModelMessages } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { UIMessage } from "ai";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context: context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

const SYSTEM_PROMPT = `You are an AI assistant for an internal company platform (~50-person software company).
Your primary purpose is to help employees understand the company's business, processes, policies, and domain knowledge.
Be concise, professional, and accurate. If you don't know something specific to the company, say so clearly.
When answering in Vietnamese, respond in Vietnamese. When answering in English, respond in English — always match the language of the user's message.`;

app.post("/ai/chat", async (c) => {
  // Auth check
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

  try {
    const result = streamText({
      model: copilotProvider.chat(model),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch {
    invalidateCopilotSession(userId);
    return c.json({ error: "COPILOT_NOT_CONNECTED" }, 403);
  }
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
