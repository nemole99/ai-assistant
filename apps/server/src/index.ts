import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@workspace/api/context";
import { appRouter } from "@workspace/api/routers/index";
import { auth } from "@workspace/auth";
import { db } from "@workspace/db";
import { user } from "@workspace/db/schema/auth";
import { env } from "@workspace/env/server";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { aiRoutes } from "./routes/ai";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    exposeHeaders: ["X-Wiki-Citations"],
    origin: env.CORS_ORIGIN,
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

export const apiHandler = new OpenAPIHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
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
    context,
    prefix: "/rpc",
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    context,
    prefix: "/api-reference",
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

app.route("/ai", aiRoutes);

app.get("/", (c) => c.text("OK"));

// Auto-seed admin account on startup if none exists
async function ensureAdminExists() {
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "ADMIN"))
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  const result = await auth.api.signUpEmail({
    body: {
      email: env.ADMIN_EMAIL,
      name: "Admin",
      password: env.ADMIN_PASSWORD,
    },
  });

  if (!result?.user?.id) {
    console.error("❌ Failed to create admin account");
    return;
  }

  await db
    .update(user)
    .set({ mustChangePassword: false, role: "ADMIN" })
    .where(eq(user.id, result.user.id));

  console.log(`✅ Admin account created: ${env.ADMIN_EMAIL}`);
}

ensureAdminExists().catch((error) =>
  console.error("❌ ensureAdminExists failed:", error)
);

export default {
  fetch: app.fetch,
  idleTimeout: 60,
};
