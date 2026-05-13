import { Queue } from "bullmq";
import Redis from "ioredis";
import { env } from "@workspace/env/server";

export const DOCUMENT_QUEUE_NAME = "document-processing";

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const documentQueue = new Queue<DocumentJobData>(DOCUMENT_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export interface DocumentJobData {
  documentId: string;
}
