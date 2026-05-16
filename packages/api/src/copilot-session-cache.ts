import { getGitHubToken } from "./routers/ai-provider";

const COPILOT_TOKEN_URL = "https://api.github.com/copilot_internal/v2/token";
const COPILOT_INTEGRATION_ID = "vscode-chat";

interface CopilotSession {
  token: string;
  endpoint: string;
  expiresAt: number; // unix ms
}

// In-memory cache keyed by userId
const cache = new Map<string, CopilotSession>();

/**
 * Returns a valid short-lived Copilot session token + endpoint for the given user.
 * Refreshes automatically when within 60 seconds of expiry.
 */
export async function getCopilotSession(
  userId: string
): Promise<CopilotSession> {
  const cached = cache.get(userId);
  if (cached && cached.expiresAt - Date.now() > 60_000) {
    return cached;
  }

  const githubToken = await getGitHubToken(userId);
  if (!githubToken) {
    throw new Error("COPILOT_NOT_CONNECTED");
  }

  const res = await fetch(COPILOT_TOKEN_URL, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${githubToken}`,
      "Copilot-Integration-Id": COPILOT_INTEGRATION_ID,
    },
  });

  if (!res.ok) {
    cache.delete(userId);
    throw new Error("COPILOT_NOT_CONNECTED");
  }

  const data = (await res.json()) as {
    token?: string;
    endpoints?: { api?: string };
    expires_at?: number;
  };

  if (!data.token) {
    throw new Error("COPILOT_NOT_CONNECTED");
  }

  const session: CopilotSession = {
    endpoint: data.endpoints?.api ?? "https://api.githubcopilot.com",
    expiresAt: data.expires_at
      ? data.expires_at * 1000
      : Date.now() + 30 * 60 * 1000, // default 30 min
    token: data.token,
  };

  cache.set(userId, session);
  return session;
}

export function invalidateCopilotSession(userId: string) {
  cache.delete(userId);
}
