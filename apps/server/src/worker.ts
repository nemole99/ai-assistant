import "dotenv/config";
import { Worker } from "bullmq";
import { db } from "@workspace/db";
import { document } from "@workspace/db/schema/auth";
import {
  DOCUMENT_QUEUE_NAME,
  redisConnection,
  type DocumentJobData,
} from "@workspace/queue";
import { getObjectBuffer } from "@workspace/storage";
import { eq } from "drizzle-orm";
import { tmpdir } from "os";
import { join } from "path";
import { writeFile, unlink } from "fs/promises";

async function processDocument(documentId: string): Promise<void> {
  const [doc] = await db
    .select()
    .from(document)
    .where(eq(document.id, documentId))
    .limit(1);

  if (!doc || doc.status !== "PENDING") {
    console.log(
      `[worker] Skipping document ${documentId} — not found or not PENDING`,
    );
    return;
  }

  const tempPath = join(tmpdir(), `doc-${documentId}.pdf`);

  try {
    console.log(`[worker] Downloading ${doc.objectKey}...`);
    const buffer = await getObjectBuffer(doc.objectKey);
    await writeFile(tempPath, buffer);

    const markitdownBin = process.env.MARKITDOWN_PATH ?? "markitdown";
    console.log(`[worker] Running markitdown on ${tempPath}...`);
    const proc = Bun.spawn([markitdownBin, tempPath], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;
    const markdown = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    if (exitCode !== 0) {
      throw new Error(
        `markitdown exited with code ${exitCode}: ${stderr.trim()}`,
      );
    }

    if (!markdown.trim()) {
      throw new Error("markitdown produced empty output");
    }

    await db
      .update(document)
      .set({ status: "COMPLETED", markdownContent: markdown })
      .where(eq(document.id, documentId));

    console.log(`[worker] Document ${documentId} processed successfully`);
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error during conversion";

    console.error(`[worker] Document ${documentId} failed:`, errorMessage);

    await db
      .update(document)
      .set({ status: "FAILED", errorMessage })
      .where(eq(document.id, documentId));

    throw err;
  } finally {
    try {
      await unlink(tempPath);
    } catch {
      // Temp file may not exist if download failed
    }
  }
}

const worker = new Worker<DocumentJobData>(
  DOCUMENT_QUEUE_NAME,
  async (job) => {
    console.log(`[worker] Processing job ${job.id} — document ${job.data.documentId}`);
    await processDocument(job.data.documentId);
  },
  {
    connection: redisConnection,
    concurrency: 2,
  },
);

worker.on("completed", (job) => {
  console.log(`[worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

console.log("[worker] Document processing worker started");
