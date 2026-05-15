import { db } from "@workspace/db";
import {
  document,
  systemAiConfig,
  wikiPage,
  wikiPageChunk,
  wikiPageSource,
} from "@workspace/db/schema/auth";
import { decrypt } from "@workspace/db/crypto";
import { eq } from "drizzle-orm";
import { generateObject, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI as createOllamaCompat } from "@ai-sdk/openai";
import { z } from "zod";
import type { LanguageModel } from "ai";

// ── helpers ──────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function getConfig(purpose: "pipeline_text" | "pipeline_embedding") {
  const [row] = await db
    .select()
    .from(systemAiConfig)
    .where(eq(systemAiConfig.purpose, purpose))
    .limit(1);
  return row ?? null;
}

function buildLanguageModel(
  providerType: string,
  modelId: string,
  apiKey: string,
  baseUrl: string | null,
): LanguageModel {
  if (providerType === "openai") {
    const provider = createOpenAI({ apiKey, baseURL: baseUrl ?? undefined });
    return provider(modelId);
  }
  if (providerType === "anthropic") {
    const provider = createAnthropic({ apiKey });
    return provider(modelId) as unknown as LanguageModel;
  }
  if (providerType === "google") {
    const provider = createGoogleGenerativeAI({
      apiKey,
      baseURL: baseUrl ?? undefined,
    });
    return provider(modelId);
  }
  if (providerType === "ollama") {
    const provider = createOllamaCompat({
      baseURL: `${baseUrl ?? "http://localhost:11434"}/v1`,
      apiKey: "ollama",
    });
    return provider(modelId);
  }
  throw new Error(`Unsupported provider: ${providerType}`);
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const config = await getConfig("pipeline_embedding");
  if (!config) throw new Error("Embedding model not configured");

  const apiKey = decrypt(config.apiKey);

  if (config.providerType === "openai") {
    const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
    const res = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.modelId, input: texts }),
    });
    if (!res.ok) throw new Error(`Embedding API ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { data: { embedding: number[]; index: number }[] };
    const sorted = data.data.sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  }

  if (config.providerType === "ollama") {
    const baseUrl = config.baseUrl ?? "http://localhost:11434";
    const embeddings: number[][] = [];
    for (const text of texts) {
      const res = await fetch(`${baseUrl}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.modelId, input: text }),
      });
      if (!res.ok) throw new Error(`Ollama embed ${res.status}`);
      const data = (await res.json()) as { embeddings: number[][] };
      embeddings.push(data.embeddings[0]!);
    }
    return embeddings;
  }

  if (config.providerType === "google") {
    const baseUrl = config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    const model = config.modelId.startsWith("models/")
      ? config.modelId
      : `models/${config.modelId}`;
    const embeddings: number[][] = [];
    for (const text of texts) {
      const res = await fetch(`${baseUrl}/${model}:embedContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          outputDimensionality: 1536,
        }),
      });
      if (!res.ok) throw new Error(`Gemini embed ${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { embedding: { values: number[] } };
      embeddings.push(data.embedding.values);
    }
    return embeddings;
  }

  throw new Error(`Unsupported embedding provider: ${config.providerType}`);
}

// ── chunking ──────────────────────────────────────────────────────────────────

function chunkByHeadings(markdown: string): string[] {
  const lines = markdown.split("\n");
  const chunks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^#{1,3}\s/.test(line) && current.length > 0) {
      const chunk = current.join("\n").trim();
      if (chunk) chunks.push(chunk);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) {
    const chunk = current.join("\n").trim();
    if (chunk) chunks.push(chunk);
  }

  // Fallback: no headings → split on double newlines with max ~2000 chars
  if (chunks.length <= 1 && markdown.length > 500) {
    return markdown
      .split(/\n\n+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
  }

  return chunks.filter((c) => c.length > 0);
}

function chunkByParagraphs(content: string): string[] {
  return content
    .split(/\n\n+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 20);
}

// ── extraction schema ─────────────────────────────────────────────────────────

const extractionSchema = z.object({
  entities: z.array(z.string()),
  concepts: z.array(z.string()),
  claims: z.array(z.string()),
  summary: z.string(),
});

type Extraction = z.infer<typeof extractionSchema>;

// ── plan schema ───────────────────────────────────────────────────────────────

const planSchema = z.object({
  create: z.array(
    z.object({
      title: z.string(),
      slug: z.string(),
      relevantChunkIndices: z.array(z.number()),
    }),
  ),
  update: z.array(
    z.object({
      pageId: z.string(),
      title: z.string(),
      relevantChunkIndices: z.array(z.number()),
    }),
  ),
});

// ── pipeline phases ───────────────────────────────────────────────────────────

export async function runIngestionPipeline(documentId: string): Promise<void> {
  // Load document
  const [doc] = await db.select().from(document).where(eq(document.id, documentId)).limit(1);
  if (!doc || !doc.markdownContent) {
    throw new Error(`Document ${documentId} not found or has no markdown content`);
  }

  // Load text config
  const textConfig = await getConfig("pipeline_text");
  if (!textConfig) throw new Error("Pipeline text model not configured");

  const apiKey = decrypt(textConfig.apiKey);
  const model = buildLanguageModel(
    textConfig.providerType,
    textConfig.modelId,
    apiKey,
    textConfig.baseUrl,
  );

  // ── PHASE 1: EXTRACT ──────────────────────────────────────────────────────
  console.log(`[wiki] EXTRACT phase for document ${documentId}`);
  const sourceChunks = chunkByHeadings(doc.markdownContent);
  const extractions: (Extraction & { sourceText: string })[] = [];

  for (const chunk of sourceChunks) {
    const { object } = await generateObject({
      model,
      schema: extractionSchema,
      prompt: `Extract structured knowledge from the following document section. Return entities (named things), concepts (important ideas/terms), claims (facts/statements), and a brief summary.\n\nDocument section:\n${chunk.slice(0, 3000)}`,
    });
    extractions.push({ ...object, sourceText: chunk });
  }

  // ── PHASE 2: PLAN ─────────────────────────────────────────────────────────
  console.log(`[wiki] PLAN phase for document ${documentId}`);
  const existingPages = await db.select({ id: wikiPage.id, title: wikiPage.title }).from(wikiPage);

  const aggregatedSummary = extractions.map((e, i) => `[${i}] ${e.summary}`).join("\n");
  const existingPagesList =
    existingPages.length > 0
      ? existingPages.map((p) => `- id:${p.id} title:${p.title}`).join("\n")
      : "(none)";

  const { object: plan } = await generateObject({
    model,
    schema: planSchema,
    prompt: `You are a wiki editor. Given extracted knowledge from a new document and the list of existing wiki pages, produce a plan:
- "create": new wiki pages to create (with title, slug, and which chunk indices [0-based] are relevant)
- "update": existing pages to update (with pageId, title, and which chunk indices are relevant)

Keep titles concise and specific. Slugs must be URL-friendly (lowercase, hyphens only).
Avoid creating duplicate pages — prefer updating existing ones if topics overlap.

Extracted summaries (chunk index → summary):
${aggregatedSummary}

Existing wiki pages:
${existingPagesList}`,
  });

  // ── PHASE 3: COMMIT ───────────────────────────────────────────────────────
  console.log(`[wiki] COMMIT phase for document ${documentId}`);

  for (const pageSpec of plan.create) {
    const relevantChunks = pageSpec.relevantChunkIndices.map((i) => extractions[i]).filter(Boolean);

    const context = relevantChunks
      .map(
        (e) =>
          `Source chunk:\n${e!.sourceText}\n\nExtracted:\n${JSON.stringify({ entities: e!.entities, concepts: e!.concepts, claims: e!.claims })}`,
      )
      .join("\n\n---\n\n");

    const { text: content } = await generateText({
      model,
      prompt: `You are a technical wiki writer. Write a comprehensive, well-structured markdown wiki article titled "${pageSpec.title}" based on the following source material. Use markdown headings, bullet points where appropriate. Be accurate and cite specific details from the source.\n\n${context.slice(0, 8000)}`,
    });

    const slug = slugify(pageSpec.slug || pageSpec.title);

    const [upsertedPage] = await db
      .insert(wikiPage)
      .values({
        id: crypto.randomUUID(),
        title: pageSpec.title,
        slug,
        content,
      })
      .onConflictDoUpdate({
        target: wikiPage.slug,
        set: { title: pageSpec.title, content },
      })
      .returning({ id: wikiPage.id });

    const actualPageId = upsertedPage!.id;

    // Upsert source link
    await db
      .insert(wikiPageSource)
      .values({ wikiPageId: actualPageId, documentId })
      .onConflictDoNothing();

    // Embed and store chunks
    await embedAndStoreChunks(actualPageId, content);
  }

  for (const pageSpec of plan.update) {
    const [existing] = await db
      .select()
      .from(wikiPage)
      .where(eq(wikiPage.id, pageSpec.pageId))
      .limit(1);
    if (!existing) continue;

    const relevantChunks = pageSpec.relevantChunkIndices.map((i) => extractions[i]).filter(Boolean);

    const newContext = relevantChunks
      .map((e) => `Source chunk:\n${e!.sourceText}`)
      .join("\n\n---\n\n");

    const { text: updatedContent } = await generateText({
      model,
      prompt: `You are a technical wiki writer. Update the following wiki article by merging new information from the source material. Keep existing content that is still accurate. Add new sections or update existing ones as needed. Maintain good markdown structure.\n\nExisting wiki article:\n${existing.content.slice(0, 4000)}\n\nNew source material:\n${newContext.slice(0, 4000)}`,
    });

    await db
      .update(wikiPage)
      .set({ content: updatedContent })
      .where(eq(wikiPage.id, pageSpec.pageId));

    // Add source link if not already present
    await db
      .insert(wikiPageSource)
      .values({ wikiPageId: pageSpec.pageId, documentId })
      .onConflictDoNothing();

    // Re-embed
    await embedAndStoreChunks(pageSpec.pageId, updatedContent);
  }
}

async function embedAndStoreChunks(pageId: string, content: string): Promise<void> {
  const paragraphs = chunkByParagraphs(content);
  if (paragraphs.length === 0) return;

  // Delete old chunks
  await db.delete(wikiPageChunk).where(eq(wikiPageChunk.wikiPageId, pageId));

  // Embed all
  const embeddings = await embedTexts(paragraphs);

  // Insert new chunks
  const chunkRows = paragraphs.map((text, i) => ({
    id: crypto.randomUUID(),
    wikiPageId: pageId,
    content: text,
    chunkIndex: i,
    embedding: embeddings[i]!,
  }));

  await db.insert(wikiPageChunk).values(chunkRows);
}
