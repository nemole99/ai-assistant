import { db } from "@workspace/db";
import { aiProvider } from "@workspace/db/schema/auth";
import { encrypt, decrypt } from "@workspace/db/crypto";
import { env } from "@workspace/env/server";
import { ORPCError } from "@orpc/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { getCopilotSession } from "../copilot-session-cache";

const DEVICE_CODE_URL = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

// --- Start Device Flow ---

export const startDeviceFlow = protectedProcedure
  .output(
    z.object({
      userCode: z.string(),
      verificationUri: z.string(),
      deviceCode: z.string(),
      expiresIn: z.number(),
      interval: z.number(),
    }),
  )
  .handler(async () => {
    const body = new URLSearchParams({
      client_id: env.GITHUB_COPILOT_CLIENT_ID,
      scope: "read:user",
    });

    const res = await fetch(DEVICE_CODE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
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
        message: data.error_description ?? data.error ?? "Failed to start GitHub device flow",
      });
    }

    return {
      deviceCode: data.device_code,
      userCode: data.user_code!,
      verificationUri: data.verification_uri!,
      expiresIn: data.expires_in!,
      interval: data.interval!,
    };
  });

// --- Poll Device Flow ---

export const pollDeviceFlow = protectedProcedure
  .input(z.object({ deviceCode: z.string() }))
  .output(
    z.discriminatedUnion("status", [
      z.object({ status: z.literal("pending") }),
      z.object({
        status: z.literal("success"),
        username: z.string(),
        avatarUrl: z.string(),
      }),
      z.object({ status: z.literal("error"), message: z.string() }),
    ]),
  )
  .handler(async ({ input, context }) => {
    const body = new URLSearchParams({
      client_id: env.GITHUB_COPILOT_CLIENT_ID,
      device_code: input.deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });

    const res = await fetch(ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!res.ok) {
      return { status: "error" as const, message: "Failed to poll GitHub" };
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
        status: "error" as const,
        message: data.error ?? "Unknown error",
      };
    }

    // Fetch GitHub user info
    const userRes = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        Accept: "application/json",
      },
    });

    if (!userRes.ok) {
      return {
        status: "error" as const,
        message: "Failed to fetch GitHub user info",
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
        id: crypto.randomUUID(),
        userId,
        provider: "github_copilot",
        encryptedToken,
        metadata: {
          username: githubUser.login,
          avatarUrl: githubUser.avatar_url,
        },
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [aiProvider.userId, aiProvider.provider],
        set: {
          encryptedToken,
          metadata: {
            username: githubUser.login,
            avatarUrl: githubUser.avatar_url,
          },
          updatedAt: now,
        },
      });

    return {
      status: "success" as const,
      username: githubUser.login,
      avatarUrl: githubUser.avatar_url,
    };
  });

// --- Disconnect ---

export const disconnect = protectedProcedure
  .input(
    z.object({
      provider: z.enum(["github_copilot", "openai", "google", "anthropic"]),
    }),
  )
  .handler(async ({ input, context }) => {
    await db
      .delete(aiProvider)
      .where(
        and(
          eq(aiProvider.userId, context.session.user.id),
          eq(aiProvider.provider, input.provider),
        ),
      );
    return { success: true };
  });

// --- List ---

const aiProviderPublicSchema = z.object({
  id: z.string(),
  provider: z.enum(["github_copilot", "openai", "google", "anthropic"]),
  username: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  connectedAt: z.string(),
});

export const list = protectedProcedure
  .output(z.array(aiProviderPublicSchema))
  .handler(async ({ context }) => {
    const rows = await db
      .select()
      .from(aiProvider)
      .where(eq(aiProvider.userId, context.session.user.id));

    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      username: row.metadata?.username ?? null,
      avatarUrl: row.metadata?.avatarUrl ?? null,
      connectedAt: row.createdAt.toISOString(),
    }));
  });

// --- Get GitHub token (for internal use) ---

export async function getGitHubToken(userId: string): Promise<string | null> {
  const rows = await db
    .select({ encryptedToken: aiProvider.encryptedToken })
    .from(aiProvider)
    .where(and(eq(aiProvider.userId, userId), eq(aiProvider.provider, "github_copilot")))
    .limit(1);

  if (!rows[0]) return null;
  return decrypt(rows[0].encryptedToken);
}

// --- List Copilot Models ---

const copilotModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  vendor: z.string(),
});

export const listCopilotModels = protectedProcedure
  .output(z.array(copilotModelSchema))
  .handler(async ({ context }) => {
    const userId = context.session.user.id;

    let session: Awaited<ReturnType<typeof getCopilotSession>>;
    try {
      session = await getCopilotSession(userId);
    } catch {
      throw new ORPCError("FORBIDDEN", {
        message: "GitHub Copilot is not connected",
      });
    }

    const res = await fetch(`${session.endpoint}/models`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Copilot-Integration-Id": "vscode-chat",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to fetch Copilot models",
      });
    }

    const data = (await res.json()) as {
      data?: {
        id?: string;
        name?: string;
        vendor?: string;
        capabilities?: { type?: string };
      }[];
    };

    const models = (data.data ?? [])
      .filter((m) => m.capabilities?.type === "chat" && m.id)
      .map((m) => ({
        id: m.id!,
        name: m.name ?? m.id!,
        vendor: m.vendor ?? "",
      }));

    return models;
  });

export const aiProviderRouter = {
  startDeviceFlow,
  pollDeviceFlow,
  disconnect,
  list,
  listCopilotModels,
};
