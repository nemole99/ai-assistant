import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { systemAiConfig, wikiPage, wikiPageChunk, wikiPageSource } from "@workspace/db/schema/auth";
import { decrypt } from "@workspace/db/crypto";
import { cosineDistance, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, protectedProcedure } from "..";

const wikiPageSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  sourceCount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const wikiPageDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  sources: z.array(
    z.object({
      documentId: z.string().nullable(),
    }),
  ),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const wikiSearchResultSchema = z.object({
  chunkId: z.string(),
  content: z.string(),
  similarity: z.number(),
  wikiPage: z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
  }),
});

async function getEmbeddingConfig() {
  const [row] = await db
    .select()
    .from(systemAiConfig)
    .where(eq(systemAiConfig.purpose, "pipeline_embedding"))
    .limit(1);
  return row ?? null;
}

async function embedQuery(query: string): Promise<number[]> {
  const config = await getEmbeddingConfig();
  if (!config) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Embedding model not configured",
    });
  }

  const apiKey = decrypt(config.apiKey);

  if (config.providerType === "openai") {
    const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
    const res = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: config.modelId, input: query }),
    });

    if (!res.ok) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `Embedding API error: ${res.status}`,
      });
    }

    const data = (await res.json()) as { data: { embedding: number[] }[] };
    return data.data[0]!.embedding;
  }

  if (config.providerType === "ollama") {
    const baseUrl = config.baseUrl ?? "http://localhost:11434";
    const res = await fetch(`${baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.modelId, input: query }),
    });

    if (!res.ok) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `Ollama embedding error: ${res.status}`,
      });
    }

    const data = (await res.json()) as { embeddings: number[][] };
    return data.embeddings[0]!;
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

    if (!res.ok) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `Gemini embedding error: ${res.status}`,
      });
    }

    const data = (await res.json()) as { embedding: { values: number[] } };
    return data.embedding.values;
  }

  throw new ORPCError("BAD_REQUEST", {
    message: `Unsupported embedding provider: ${config.providerType}`,
  });
}

export const wikiPageRouter = {
  list: protectedProcedure
    .input(
      z
        .object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
        })
        .optional(),
    )
    .output(z.object({ items: z.array(wikiPageSummarySchema), total: z.number() }))
    .handler(async ({ input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const offset = (page - 1) * limit;

      const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(wikiPage);

      const rows = await db
        .select({
          id: wikiPage.id,
          title: wikiPage.title,
          slug: wikiPage.slug,
          createdAt: wikiPage.createdAt,
          updatedAt: wikiPage.updatedAt,
          sourceCount: sql<number>`count(${wikiPageSource.wikiPageId})::int`,
        })
        .from(wikiPage)
        .leftJoin(wikiPageSource, eq(wikiPage.id, wikiPageSource.wikiPageId))
        .groupBy(wikiPage.id)
        .orderBy(desc(wikiPage.updatedAt))
        .limit(limit)
        .offset(offset);

      return {
        items: rows,
        total: countRow?.count ?? 0,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(wikiPageDetailSchema)
    .handler(async ({ input }) => {
      const [row] = await db.select().from(wikiPage).where(eq(wikiPage.id, input.id)).limit(1);

      if (!row) {
        throw new ORPCError("NOT_FOUND", { message: "WikiPage not found" });
      }

      const sources = await db
        .select({ documentId: wikiPageSource.documentId })
        .from(wikiPageSource)
        .where(eq(wikiPageSource.wikiPageId, input.id));

      return { ...row, sources };
    }),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .output(wikiPageDetailSchema)
    .handler(async ({ input }) => {
      const [row] = await db.select().from(wikiPage).where(eq(wikiPage.slug, input.slug)).limit(1);

      if (!row) {
        throw new ORPCError("NOT_FOUND", { message: "WikiPage not found" });
      }

      const sources = await db
        .select({ documentId: wikiPageSource.documentId })
        .from(wikiPageSource)
        .where(eq(wikiPageSource.wikiPageId, row.id));

      return { ...row, sources };
    }),

  delete: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
    const [row] = await db
      .select({ id: wikiPage.id })
      .from(wikiPage)
      .where(eq(wikiPage.id, input.id))
      .limit(1);

    if (!row) {
      throw new ORPCError("NOT_FOUND", { message: "WikiPage not found" });
    }

    await db.delete(wikiPage).where(eq(wikiPage.id, input.id));
    return { success: true };
  }),

  search: protectedProcedure
    .input(
      z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(20).default(5) }),
    )
    .output(z.array(wikiSearchResultSchema))
    .handler(async ({ input }) => {
      const embeddingConfig = await getEmbeddingConfig();
      if (!embeddingConfig) return [];

      let queryVector: number[];
      try {
        queryVector = await embedQuery(input.query);
      } catch {
        return [];
      }

      const similarity = sql<number>`1 - (${cosineDistance(wikiPageChunk.embedding, queryVector)})`;

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
        .limit(input.limit);

      return rows.map((r) => ({
        chunkId: r.chunkId,
        content: r.content,
        similarity: r.similarity,
        wikiPage: { id: r.wikiPageId, title: r.wikiPageTitle, slug: r.wikiPageSlug },
      }));
    }),
};
