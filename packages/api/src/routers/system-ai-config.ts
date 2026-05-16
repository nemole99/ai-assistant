import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { decrypt, encrypt } from "@workspace/db/crypto";
import { systemAiConfig } from "@workspace/db/schema/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure } from "..";

const purposeEnum = z.enum(["pipeline_text", "pipeline_embedding"]);

const configOutputSchema = z.object({
  apiKeyMasked: z.string(),
  baseUrl: z.string().nullable(),
  createdAt: z.date(),
  id: z.string(),
  modelId: z.string(),
  providerType: z.string(),
  purpose: purposeEnum,
  updatedAt: z.date(),
});

function maskApiKey(encrypted: string): string {
  try {
    const plain = decrypt(encrypted);
    if (plain.length <= 4) {
      return "****";
    }
    return `****${plain.slice(-4)}`;
  } catch {
    return "****";
  }
}

export const systemAiConfigRouter = {
  delete: adminProcedure
    .input(z.object({ purpose: purposeEnum }))
    .handler(async ({ input }) => {
      await db
        .delete(systemAiConfig)
        .where(eq(systemAiConfig.purpose, input.purpose));
      return { success: true };
    }),

  get: adminProcedure
    .input(z.object({ purpose: purposeEnum }))
    .output(configOutputSchema.nullable())
    .handler(async ({ input }) => {
      const [row] = await db
        .select()
        .from(systemAiConfig)
        .where(eq(systemAiConfig.purpose, input.purpose))
        .limit(1);

      if (!row) {
        return null;
      }

      return {
        ...row,
        apiKeyMasked: await maskApiKey(row.apiKey),
      };
    }),

  testConnection: adminProcedure
    .input(z.object({ purpose: purposeEnum }))
    .output(z.object({ error: z.string().optional(), ok: z.boolean() }))
    .handler(async ({ input }) => {
      const [row] = await db
        .select()
        .from(systemAiConfig)
        .where(eq(systemAiConfig.purpose, input.purpose))
        .limit(1);

      if (!row) {
        throw new ORPCError("NOT_FOUND", {
          message: "Config not found for this purpose",
        });
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
            return {
              error: `API returned ${res.status}: ${text.slice(0, 200)}`,
              ok: false,
            };
          }
          return { ok: true };
        }

        if (row.providerType === "anthropic") {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            body: JSON.stringify({
              max_tokens: 1,
              messages: [{ content: "ping", role: "user" }],
              model: row.modelId,
            }),
            headers: {
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
              "x-api-key": apiKey,
            },
            method: "POST",
          });
          if (!res.ok && res.status !== 400) {
            const text = await res.text();
            return {
              error: `API returned ${res.status}: ${text.slice(0, 200)}`,
              ok: false,
            };
          }
          return { ok: true };
        }

        if (row.providerType === "ollama") {
          const baseUrl = row.baseUrl ?? "http://localhost:11434";
          const res = await fetch(`${baseUrl}/api/tags`);
          if (!res.ok) {
            return { error: `Ollama returned ${res.status}`, ok: false };
          }
          return { ok: true };
        }

        if (row.providerType === "google") {
          const baseUrl =
            row.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
          const model = row.modelId.startsWith("models/")
            ? row.modelId
            : `models/${row.modelId}`;

          if (input.purpose === "pipeline_embedding") {
            const res = await fetch(`${baseUrl}/${model}:embedContent`, {
              body: JSON.stringify({
                content: { parts: [{ text: "ping" }] },
                outputDimensionality: 1536,
              }),
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              method: "POST",
            });
            if (!res.ok) {
              const text = await res.text();
              return {
                error: `API returned ${res.status}: ${text.slice(0, 200)}`,
                ok: false,
              };
            }
            return { ok: true };
          }

          const res = await fetch(`${baseUrl}/${model}:generateContent`, {
            body: JSON.stringify({
              contents: [{ parts: [{ text: "ping" }] }],
              generationConfig: { maxOutputTokens: 1 },
            }),
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            method: "POST",
          });
          if (!res.ok) {
            const text = await res.text();
            return {
              error: `API returned ${res.status}: ${text.slice(0, 200)}`,
              ok: false,
            };
          }
          return { ok: true };
        }

        return {
          error: `Unknown provider type: ${row.providerType}`,
          ok: false,
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Connection failed",
          ok: false,
        };
      }
    }),

  upsert: adminProcedure
    .input(
      z.object({
        apiKey: z.string().min(1),
        baseUrl: z.string().url().optional().nullable(),
        modelId: z.string().min(1),
        providerType: z.string().min(1),
        purpose: purposeEnum,
      })
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

      const encryptedKey = keepExistingKey
        ? existing!.apiKey
        : encrypt(input.apiKey);

      const [row] = await db
        .insert(systemAiConfig)
        .values({
          apiKey: encryptedKey,
          baseUrl: input.baseUrl ?? null,
          id: crypto.randomUUID(),
          modelId: input.modelId,
          providerType: input.providerType,
          purpose: input.purpose,
        })
        .onConflictDoUpdate({
          set: {
            apiKey: encryptedKey,
            baseUrl: input.baseUrl ?? null,
            modelId: input.modelId,
            providerType: input.providerType,
          },
          target: systemAiConfig.purpose,
        })
        .returning();

      if (!row) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to save config",
        });
      }

      return {
        ...row,
        apiKeyMasked: await maskApiKey(row.apiKey),
      };
    }),
};
