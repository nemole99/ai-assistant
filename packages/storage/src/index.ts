import { Client } from "minio";
import { env } from "@workspace/env/server";

// Internal client — connects to MinIO via Docker service name (e.g. "minio").
// Used for bucket ops, getObject, deleteObject, etc.
export const storageClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

// Presign client — signs URLs with the public hostname so browsers can reach
// MinIO directly. AWS4 signatures include the Host header, so the signing
// endpoint MUST match what the browser will send.
// Setting `region` explicitly prevents the SDK from making a network call to
// discover the bucket region (which would fail with ECONNREFUSED inside Docker
// since the public hostname isn't reachable from within the container).
const presignEndpoint = env.MINIO_PUBLIC_ENDPOINT ?? env.MINIO_ENDPOINT;
const presignClient = new Client({
  endPoint: presignEndpoint,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
  region: "us-east-1",
});

const BUCKET = env.MINIO_BUCKET;

export async function ensureBucketExists(): Promise<void> {
  const exists = await storageClient.bucketExists(BUCKET);
  if (!exists) {
    await storageClient.makeBucket(BUCKET);
  }
}

export async function presignedPutUrl(objectKey: string, ttlSeconds = 300): Promise<string> {
  return presignClient.presignedPutObject(BUCKET, objectKey, ttlSeconds);
}

export async function presignedGetUrl(objectKey: string, ttlSeconds = 300): Promise<string> {
  return presignClient.presignedGetObject(BUCKET, objectKey, ttlSeconds);
}

export async function deleteObject(objectKey: string): Promise<void> {
  await storageClient.removeObject(BUCKET, objectKey);
}

export async function objectExists(objectKey: string): Promise<boolean> {
  try {
    await storageClient.statObject(BUCKET, objectKey);
    return true;
  } catch {
    return false;
  }
}

export async function getObjectBuffer(objectKey: string): Promise<Buffer> {
  const stream = await storageClient.getObject(BUCKET, objectKey);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

export function documentObjectKey(documentId: string): string {
  return `global/${documentId}/original.pdf`;
}

export function projectDocumentObjectKey(projectId: string, documentId: string): string {
  return `projects/${projectId}/${documentId}/original.pdf`;
}
