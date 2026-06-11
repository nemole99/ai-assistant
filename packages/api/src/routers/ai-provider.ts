import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { encrypt, decrypt } from "@workspace/db/crypto";
import { aiProvider } from "@workspace/db/schema/auth";
import { env } from "@workspace/env/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

import { getCopilotSession } from "../copilot-session-cache";
import { protectedProcedure } from "../index";

const DEVICE_CODE_URL = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

// --- Start Device Flow ---

export const startDeviceFlow = protectedProcedure
  .output(
    z.object({
      deviceCode: z.string(),
      expiresIn: z.number(),
      interval: z.number(),
      userCode: z.string(),
      verificationUri: z.string(),
    })
  )
  .handler(async () => {
    const body = new URLSearchParams({
      client_id: env.GITHUB_COPILOT_CLIENT_ID,
      scope: "read:user",
    });

    const res = await fetch(DEVICE_CODE_URL, {
      body,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    const data = (await res.json()) as {
      device_code?: string;
      user_code?: string;
      verification_uri?: string;
      expires_in?: number;
      interval?: number;
      error?: string;
      error_description?: string;
    };

    if (!res.ok || data.error || !data.device_code) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message:
          data.error_description ??
          data.error ??
          "Failed to start GitHub device flow",
      });
    }

    return {
      deviceCode: data.device_code,
      expiresIn: data.expires_in!,
      interval: data.interval!,
      userCode: data.user_code!,
      verificationUri: data.verification_uri!,
    };
  });

// --- Poll Device Flow ---

export const pollDeviceFlow = protectedProcedure
  .input(z.object({ deviceCode: z.string() }))
  .output(
    z.discriminatedUnion("status", [
      z.object({ status: z.literal("pending") }),
      z.object({
        avatarUrl: z.string(),
        status: z.literal("success"),
        username: z.string(),
      }),
      z.object({ message: z.string(), status: z.literal("error") }),
    ])
  )
  .handler(async ({ input, context }) => {
    const body = new URLSearchParams({
      client_id: env.GITHUB_COPILOT_CLIENT_ID,
      device_code: input.deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });

    const res = await fetch(ACCESS_TOKEN_URL, {
      body,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    });

    if (!res.ok) {
      return { message: "Failed to poll GitHub", status: "error" as const };
    }

    const data = (await res.json()) as {
      access_token?: string;
      error?: string;
    };

    if (data.error === "authorization_pending" || data.error === "slow_down") {
      return { status: "pending" as const };
    }

    if (data.error || !data.access_token) {
      return {
        message: data.error ?? "Unknown error",
        status: "error" as const,
      };
    }

    // Fetch GitHub user info
    const userRes = await fetch(GITHUB_USER_URL, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${data.access_token}`,
      },
    });

    if (!userRes.ok) {
      return {
        message: "Failed to fetch GitHub user info",
        status: "error" as const,
      };
    }

    const githubUser = (await userRes.json()) as {
      login: string;
      avatar_url: string;
    };

    const encryptedToken = encrypt(data.access_token);
    const userId = context.session.user.id;
    const now = new Date();

    await db
      .insert(aiProvider)
      .values({
        createdAt: now,
        encryptedToken,
        id: crypto.randomUUID(),
        metadata: {
          avatarUrl: githubUser.avatar_url,
          username: githubUser.login,
        },
        provider: "github_copilot",
        updatedAt: now,
        userId,
      })
      .onConflictDoUpdate({
        set: {
          encryptedToken,
          metadata: {
            avatarUrl: githubUser.avatar_url,
            username: githubUser.login,
          },
          updatedAt: now,
        },
        target: [aiProvider.userId, aiProvider.provider],
      });

    return {
      avatarUrl: githubUser.avatar_url,
      status: "success" as const,
      username: githubUser.login,
    };
  });

// --- Disconnect ---

export const disconnect = protectedProcedure
  .input(
    z.object({
      provider: z.enum(["github_copilot", "openai", "google", "anthropic"]),
    })
  )
  .handler(async ({ input, context }) => {
    await db
      .delete(aiProvider)
      .where(
        and(
          eq(aiProvider.userId, context.session.user.id),
          eq(aiProvider.provider, input.provider)
        )
      );
    return { success: true };
  });

// --- List ---

const aiProviderPublicSchema = z.object({
  avatarUrl: z.string().nullable(),
  connectedAt: z.string(),
  id: z.string(),
  provider: z.enum(["github_copilot", "openai", "google", "anthropic"]),
  username: z.string().nullable(),
});

export const list = protectedProcedure
  .output(z.array(aiProviderPublicSchema))
  .handler(async ({ context }) => {
    const rows = await db
      .select()
      .from(aiProvider)
      .where(eq(aiProvider.userId, context.session.user.id));

    return rows.map((row) => ({
      avatarUrl: row.metadata?.avatarUrl ?? null,
      connectedAt: row.createdAt.toISOString(),
      id: row.id,
      provider: row.provider,
      username: row.metadata?.username ?? null,
    }));
  });

// --- Get GitHub token (for internal use) ---

export async function getGitHubToken(userId: string): Promise<string | null> {
  const rows = await db
    .select({ encryptedToken: aiProvider.encryptedToken })
    .from(aiProvider)
    .where(
      and(
        eq(aiProvider.userId, userId),
        eq(aiProvider.provider, "github_copilot")
      )
    )
    .limit(1);

  if (!rows[0]) {
    return null;
  }
  return decrypt(rows[0].encryptedToken);
}

// --- List Models ---

const aiModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.string(),
});

export const listModels = protectedProcedure
  .output(z.array(aiModelSchema))
  .handler(async ({ context }) => {
    const userId = context.session.user.id;
    const models: { id: string; name: string; provider: string }[] = [];

    // Fetch Local AI models if configured
    if (env.OLLAMA_BASE_URL) {
      const fetchedModels: { id: string; name: string; provider: string }[] =
        [];
      try {
        const res = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`);
        if (res.ok) {
          const data = (await res.json()) as { models?: { name: string }[] };
          if (data.models && Array.isArray(data.models)) {
            fetchedModels.push(
              ...data.models.map((m) => ({
                id: `ollama:${m.name}`,
                name: m.name,
                provider: "Local AI",
              }))
            );
          }
        }
      } catch {
        // Ignore and try fallback
      }

      if (fetchedModels.length === 0) {
        try {
          const res = await fetch(`${env.OLLAMA_BASE_URL}/v1/models`);
          if (res.ok) {
            const data = (await res.json()) as { data?: { id: string }[] };
            if (data.data && Array.isArray(data.data)) {
              fetchedModels.push(
                ...data.data.map((m) => ({
                  id: `ollama:${m.id}`,
                  name: m.id,
                  provider: "Local AI",
                }))
              );
            }
          }
        } catch (error) {
          console.error("Failed to fetch local AI models:", error);
        }
      }

      models.push(...fetchedModels);
    }

    let session: Awaited<ReturnType<typeof getCopilotSession>> | null = null;
    try {
      session = await getCopilotSession(userId);
    } catch {
      // Ignore if no Copilot token
    }

    if (session) {
      const res = await fetch(`${session.endpoint}/models`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${session.token}`,
          "Copilot-Integration-Id": "vscode-chat",
        },
      });

      if (res.ok) {
        const data = (await res.json()) as {
          data?: {
            id?: string;
            name?: string;
            vendor?: string;
            capabilities?: { type?: string };
          }[];
        };

        const copilotModels = (data.data ?? [])
          .filter((m) => m.capabilities?.type === "chat" && m.id)
          .map((m) => ({
            id: `copilot:${m.id!}`,
            name: m.name ?? m.id!,
            provider: "GitHub Copilot",
          }));

        models.push(...copilotModels);
      }
    }

    return models;
  });

export const aiProviderRouter = {
  disconnect,
  list,
  listModels,
  pollDeviceFlow,
  startDeviceFlow,
};
