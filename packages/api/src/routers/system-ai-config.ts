import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { systemAiConfig } from "@workspace/db/schema/auth";
import { decrypt, encrypt } from "@workspace/db/crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure } from "..";

const purposeEnum = z.enum(["pipeline_text", "pipeline_embedding"]);

const configOutputSchema = z.object({
  id: z.string(),
  purpose: purposeEnum,
  providerType: z.string(),
  apiKeyMasked: z.string(),
  modelId: z.string(),
  baseUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

async function maskApiKey(encrypted: string): Promise<string> {
  try {
    const plain = decrypt(encrypted);
    if (plain.length <= 4) return "****";
    return `****${plain.slice(-4)}`;
  } catch {
    return "****";
  }
}

export const systemAiConfigRouter = {
  get: adminProcedure
    .input(z.object({ purpose: purposeEnum }))
    .output(configOutputSchema.nullable())
    .handler(async ({ input }) => {
      const [row] = await db
        .select()
        .from(systemAiConfig)
        .where(eq(systemAiConfig.purpose, input.purpose))
        .limit(1);

      if (!row) return null;

      return {
        ...row,
        apiKeyMasked: await maskApiKey(row.apiKey),
      };
    }),

  upsert: adminProcedure
    .input(
      z.object({
        purpose: purposeEnum,
        providerType: z.string().min(1),
        apiKey: z.string().min(1),
        modelId: z.string().min(1),
        baseUrl: z.string().url().optional().nullable(),
      }),
    )
    .output(configOutputSchema)
    .handler(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(systemAiConfig)
        .where(eq(systemAiConfig.purpose, input.purpose))
        .limit(1);

      const keepExistingKey = input.apiKey === "KEEP_EXISTING";
      if (keepExistingKey && !existing) {
        throw new ORPCError("BAD_REQUEST", {
          message: "API key is required for new configuration",
        });
      }

      const encryptedKey = keepExistingKey ? existing!.apiKey : encrypt(input.apiKey);

      const [row] = await db
        .insert(systemAiConfig)
        .values({
          id: crypto.randomUUID(),
          purpose: input.purpose,
          providerType: input.providerType,
          apiKey: encryptedKey,
          modelId: input.modelId,
          baseUrl: input.baseUrl ?? null,
        })
        .onConflictDoUpdate({
          target: systemAiConfig.purpose,
          set: {
            providerType: input.providerType,
            apiKey: encryptedKey,
            modelId: input.modelId,
            baseUrl: input.baseUrl ?? null,
          },
        })
        .returning();

      if (!row) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to save config" });
      }

      return {
        ...row,
        apiKeyMasked: await maskApiKey(row.apiKey),
      };
    }),

  delete: adminProcedure.input(z.object({ purpose: purposeEnum })).handler(async ({ input }) => {
    await db.delete(systemAiConfig).where(eq(systemAiConfig.purpose, input.purpose));
    return { success: true };
  }),

  testConnection: adminProcedure
    .input(z.object({ purpose: purposeEnum }))
    .output(z.object({ ok: z.boolean(), error: z.string().optional() }))
    .handler(async ({ input }) => {
      const [row] = await db
        .select()
        .from(systemAiConfig)
        .where(eq(systemAiConfig.purpose, input.purpose))
        .limit(1);

      if (!row) {
        throw new ORPCError("NOT_FOUND", { message: "Config not found for this purpose" });
      }

      const apiKey = decrypt(row.apiKey);

      try {
        if (row.providerType === "openai") {
          const baseUrl = row.baseUrl ?? "https://api.openai.com/v1";
          const res = await fetch(`${baseUrl}/models`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!res.ok) {
            const text = await res.text();
            return { ok: false, error: `API returned ${res.status}: ${text.slice(0, 200)}` };
          }
          return { ok: true };
        }

        if (row.providerType === "anthropic") {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: row.modelId,
              max_tokens: 1,
              messages: [{ role: "user", content: "ping" }],
            }),
          });
          if (!res.ok && res.status !== 400) {
            const text = await res.text();
            return { ok: false, error: `API returned ${res.status}: ${text.slice(0, 200)}` };
          }
          return { ok: true };
        }

        if (row.providerType === "ollama") {
          const baseUrl = row.baseUrl ?? "http://localhost:11434";
          const res = await fetch(`${baseUrl}/api/tags`);
          if (!res.ok) {
            return { ok: false, error: `Ollama returned ${res.status}` };
          }
          return { ok: true };
        }

        if (row.providerType === "google") {
          const baseUrl = row.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
          const model = row.modelId.startsWith("models/") ? row.modelId : `models/${row.modelId}`;

          if (input.purpose === "pipeline_embedding") {
            const res = await fetch(`${baseUrl}/${model}:embedContent`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              body: JSON.stringify({
                content: { parts: [{ text: "ping" }] },
                outputDimensionality: 1536,
              }),
            });
            if (!res.ok) {
              const text = await res.text();
              return { ok: false, error: `API returned ${res.status}: ${text.slice(0, 200)}` };
            }
            return { ok: true };
          }

          const res = await fetch(`${baseUrl}/${model}:generateContent`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "ping" }] }],
              generationConfig: { maxOutputTokens: 1 },
            }),
          });
          if (!res.ok) {
            const text = await res.text();
            return { ok: false, error: `API returned ${res.status}: ${text.slice(0, 200)}` };
          }
          return { ok: true };
        }

        return { ok: false, error: `Unknown provider type: ${row.providerType}` };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Connection failed",
        };
      }
    }),
};
