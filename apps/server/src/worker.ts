import "dotenv/config";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { db } from "@workspace/db";
import { document, systemAiConfig } from "@workspace/db/schema/auth";
import {
  DOCUMENT_QUEUE_NAME,
  WIKI_INGESTION_QUEUE_NAME,
  redisConnection,
  wikiIngestionQueue,
} from "@workspace/queue";
import type { DocumentJobData, WikiIngestionJobData } from "@workspace/queue";
import { getObjectBuffer } from "@workspace/storage";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";

import { runIngestionPipeline } from "./wiki/ingestion-pipeline";

async function processDocument(documentId: string): Promise<void> {
  const [doc] = await db
    .select()
    .from(document)
    .where(eq(document.id, documentId))
    .limit(1);

  if (!doc || doc.status !== "PENDING") {
    console.log(
      `[worker] Skipping document ${documentId} — not found or not PENDING`
    );
    return;
  }

  const tempPath = path.join(tmpdir(), `doc-${documentId}.pdf`);

  try {
    console.log(`[worker] Downloading ${doc.objectKey}...`);
    const buffer = await getObjectBuffer(doc.objectKey);
    await writeFile(tempPath, buffer);

    const markitdownBin = process.env.MARKITDOWN_PATH ?? "markitdown";
    console.log(`[worker] Running markitdown on ${tempPath}...`);
    const proc = Bun.spawn([markitdownBin, tempPath], {
      stderr: "pipe",
      stdout: "pipe",
    });

    const exitCode = await proc.exited;
    const markdown = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    if (exitCode !== 0) {
      throw new Error(
        `markitdown exited with code ${exitCode}: ${stderr.trim()}`
      );
    }

    if (!markdown.trim()) {
      throw new Error("markitdown produced empty output");
    }

    await db
      .update(document)
      .set({ markdownContent: markdown, status: "COMPLETED" })
      .where(eq(document.id, documentId));

    console.log(`[worker] Document ${documentId} processed successfully`);

    // Trigger wiki ingestion if configured
    const [textConfig] = await db
      .select({ id: systemAiConfig.id })
      .from(systemAiConfig)
      .where(eq(systemAiConfig.purpose, "pipeline_text"))
      .limit(1);

    const [embeddingConfig] = await db
      .select({ id: systemAiConfig.id })
      .from(systemAiConfig)
      .where(eq(systemAiConfig.purpose, "pipeline_embedding"))
      .limit(1);

    if (textConfig && embeddingConfig) {
      console.log(
        `[worker] Enqueueing wiki ingestion for document ${documentId}`
      );
      await db
        .update(document)
        .set({ status: "INGESTING" })
        .where(eq(document.id, documentId));
      await wikiIngestionQueue.add("ingest", { documentId });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error during conversion";

    console.error(`[worker] Document ${documentId} failed:`, errorMessage);

    await db
      .update(document)
      .set({ errorMessage, status: "FAILED" })
      .where(eq(document.id, documentId));

    throw error;
  } finally {
    try {
      await unlink(tempPath);
    } catch {
      // Temp file may not exist if download failed
    }
  }
}

async function processWikiIngestion(documentId: string): Promise<void> {
  const [doc] = await db
    .select()
    .from(document)
    .where(eq(document.id, documentId))
    .limit(1);

  if (!doc) {
    console.log(`[wiki-worker] Document ${documentId} not found — skipping`);
    return;
  }

  if (doc.status !== "INGESTING") {
    console.log(
      `[wiki-worker] Document ${documentId} not in INGESTING state — skipping`
    );
    return;
  }

  try {
    await runIngestionPipeline(documentId);

    await db
      .update(document)
      .set({ errorMessage: null, status: "INGESTED" })
      .where(eq(document.id, documentId));

    console.log(`[wiki-worker] Document ${documentId} ingested successfully`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown ingestion error";

    console.error(
      `[wiki-worker] Document ${documentId} ingestion failed:`,
      errorMessage
    );

    await db
      .update(document)
      .set({ errorMessage, status: "INGEST_FAILED" })
      .where(eq(document.id, documentId));

    throw error;
  }
}

const documentWorker = new Worker<DocumentJobData>(
  DOCUMENT_QUEUE_NAME,
  async (job) => {
    console.log(
      `[worker] Processing job ${job.id} — document ${job.data.documentId}`
    );
    await processDocument(job.data.documentId);
  },
  {
    concurrency: 2,
    connection: redisConnection,
  }
);

documentWorker.on("completed", (job) => {
  console.log(`[worker] Job ${job.id} completed`);
});

documentWorker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

const wikiWorker = new Worker<WikiIngestionJobData>(
  WIKI_INGESTION_QUEUE_NAME,
  async (job) => {
    console.log(
      `[wiki-worker] Processing job ${job.id} — document ${job.data.documentId}`
    );
    await processWikiIngestion(job.data.documentId);
  },
  {
    concurrency: 1,
    connection: redisConnection,
  }
);

wikiWorker.on("completed", (job) => {
  console.log(`[wiki-worker] Job ${job.id} completed`);
});

wikiWorker.on("failed", (job, err) => {
  console.error(`[wiki-worker] Job ${job?.id} failed:`, err.message);
});

console.log("[worker] Document processing worker started");
console.log("[wiki-worker] Wiki ingestion worker started");
