import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  emptyStringAsUndefined: true,
  runtimeEnv: process.env,
  server: {
    ADMIN_EMAIL: z.string().email(),
    ADMIN_PASSWORD: z.string().min(8),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    DATABASE_URL: z.string().min(1),
    DEFAULT_USER_PASSWORD: z.string().min(6),
    ENCRYPTION_KEY: z
      .string()
      .length(64, "ENCRYPTION_KEY must be a 64-character hex string"),
    GITHUB_COPILOT_CLIENT_ID: z.string().default("Iv1.b507a08c87ecfe98"),
    JIRA_BASE_URL: z.string().url().optional(),
    JIRA_DEVELOPERS: z.string().optional(), // "email1:Name1,email2:Name2"
    JIRA_PROJECT: z.string().optional(),
    JIRA_TOKEN: z.string().optional(),
    MINIO_ACCESS_KEY: z.string().min(1),
    MINIO_BUCKET: z.string().min(1).default("documents"),
    MINIO_ENDPOINT: z.string().min(1),
    MINIO_PORT: z.coerce.number().int().positive().default(9000),
    MINIO_PUBLIC_ENDPOINT: z.string().optional(),
    MINIO_SECRET_KEY: z.string().min(1),
    MINIO_USE_SSL: z
      .string()
      .default("false")
      .transform((v) => v === "true"),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    OLLAMA_BASE_URL: z.string().url().optional(),
    REDIS_URL: z.string().url(),
  },
});
