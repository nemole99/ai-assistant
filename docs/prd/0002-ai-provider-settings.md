# AI Provider Settings

## Problem Statement

Nhân viên muốn sử dụng GitHub Copilot Enterprise của công ty để chatting/hỏi đáp trực tiếp trong internal tooling platform. Hiện tại không có cách nào để User kết nối GitHub account với platform, và phần Settings hiện có các tab Account + Notifications thừa không có giá trị thực tế (UI placeholder, không persist dữ liệu).

## Solution

Thêm tab **AI Providers** vào Settings, cho phép User kết nối GitHub account thông qua GitHub Device Flow để lấy quyền truy cập GitHub Copilot Enterprise. Xoá các tab Account và Notifications không cần thiết. Schema được thiết kế để hỗ trợ nhiều AI provider (OpenAI, Google, Anthropic) và nhiều mục đích sử dụng model (chat, embedding, vision) trong tương lai.

## User Stories

1. As an **Employee**, I want to see an "AI Providers" tab in Settings, so that I can manage my AI service connections in one place.
2. As an **Employee**, I want to connect my GitHub account via a device flow (not a redirect), so that I don't need to leave the current page to authorize.
3. As an **Employee**, I want to see a dialog with a user code and a button to open GitHub's authorization page, so that I can complete the GitHub connection without copy-pasting URLs.
4. As an **Employee**, I want to copy the user code to clipboard from the dialog, so that I can paste it quickly on GitHub.
5. As an **Employee**, I want the dialog to automatically detect when I have authorized on GitHub, so that I don't have to manually confirm the connection.
6. As an **Employee**, I want to see a success state when GitHub is connected, so that I know the connection was established.
7. As an **Employee**, I want to see the connected GitHub username/avatar after linking, so that I can confirm I linked the correct account.
8. As an **Employee**, I want to disconnect my GitHub account at any time, so that I can revoke access or reconnect with a different account.
9. As an **Employee**, I want to see OpenAI, Google, and Anthropic listed as "Coming soon" providers, so that I know these will be available in the future.
10. As an **Employee**, I want my GitHub token to be stored securely on the server (not in the browser), so that my credentials are protected.
11. As an **Employee**, I want the Settings page to only show Profile and AI Providers tabs, so that the UI is clean and focused.
12. As an **Admin**, I want each User to manage their own AI provider connections independently, so that personal tokens are not shared.
13. As an **Employee**, I want the connection process to time out gracefully if I don't authorize within the allowed window, so that I get clear feedback to try again.
14. As an **Employee**, I want to see a loading/waiting state while the system polls for my GitHub authorization, so that I know the process is in progress.
15. As an **Employee**, I want the connection to persist across browser sessions and devices, so that I only need to connect once.

## Implementation Decisions

**Schema: two new tables**

`ai_provider` — stores encrypted credentials per User per provider:

- `id`, `userId` (FK → user), `provider` (enum: `github_copilot`, `openai`, `google`, `anthropic`), `encryptedToken`, `metadata` (jsonb — e.g. GitHub username, avatar), `createdAt`, `updatedAt`
- Unique constraint: `(userId, provider)`

`ai_model_assignment` — stores which model+provider is used for each purpose:

- `id`, `userId` (FK → user), `providerId` (FK → ai_provider), `purpose` (enum: `chat`, `embedding`, `vision`), `model` (string), `createdAt`, `updatedAt`
- Unique constraint: `(userId, purpose)`

Note: `ai_model_assignment` is not used in this phase (no model selection UI yet), but the table is created now so future migrations are minimal.

**Token encryption: AES-256-GCM**

All tokens and API keys are encrypted with AES-256-GCM before being stored. A single `ENCRYPTION_KEY` environment variable (32-byte hex string) is used as the symmetric key. Each ciphertext is stored as `iv:ciphertext:authTag`. Decryption only happens server-side; the raw token is never sent to the client.

**GitHub Device Flow**

Uses GitHub's Device Authorization Grant:

- `client_id`: `Iv1.b507a08c87ecfe98` (well-known Copilot client ID, configurable via env var `GITHUB_COPILOT_CLIENT_ID`)
- Scope: `read:user`
- Endpoints: `POST https://github.com/login/device/code` → `POST https://github.com/login/oauth/access_token`

After connecting, the GitHub token is exchanged for a Copilot API token via `GET https://api.github.com/copilot_internal/v2/token` (header: `Authorization: Bearer <github_token>`, `Copilot-Integration-Id`). This exchange happens at chat-time, not at connection-time. The Copilot token is short-lived and should be cached in memory, not persisted.

**oRPC procedures: `aiProvider` router**

- `aiProvider.startDeviceFlow` (protectedProcedure) — calls GitHub device code endpoint, returns `{ userCode, verificationUri, deviceCode, expiresIn, interval }`
- `aiProvider.pollDeviceFlow` (protectedProcedure) — input: `{ deviceCode }`. Calls GitHub access token endpoint once. Returns `{ status: "pending" | "success" | "error" }`. On success: encrypts token, fetches GitHub user info, upserts `ai_provider` row, returns `{ status: "success", username, avatarUrl }`.
- `aiProvider.disconnect` (protectedProcedure) — input: `{ provider }`. Deletes the `ai_provider` row for the current user.
- `aiProvider.list` (protectedProcedure) — returns list of connected providers with metadata (username, avatarUrl) but never the raw token.

**Client-side polling**

The frontend calls `aiProvider.pollDeviceFlow` every `interval` seconds (value returned by `startDeviceFlow`). Polling stops when status is `success`, `error`, or when the dialog is closed/cancelled. The device code expires after `expiresIn` seconds — the frontend shows a timeout state and prompts the user to restart.

**Settings UI changes**

- Remove `account` and `notifications` routes and feature directories.
- Remove their entries from the sidebar nav.
- Add `ai-providers` route and feature directory.
- Settings sidebar nav becomes: **Profile** | **AI Providers**
- AI Providers page layout:
  - Section: "Connected Providers" — card per provider with connect/disconnect action
  - GitHub Copilot: device flow dialog on connect, shows username + avatar when connected
  - OpenAI, Google, Anthropic: "Coming soon" badge, no action
  - Section: "Model Assignment" — hidden/not rendered in this phase

**No model assignment UI in this phase**

The `ai_model_assignment` table is created but no UI is built. Model assignment will be implemented when the chat feature is built and model selection is needed.

## Testing Decisions

Good tests in this codebase test external behavior only — they call the oRPC procedure handler with a constructed context and assert on the returned value or thrown error, without asserting on internal DB queries or intermediate state. See the existing auth procedure tests pattern described in `docs/prd/0001-auth-organization-permissions.md`.

**Modules to test:**

- **`aiProvider.pollDeviceFlow`** — integration test: mock GitHub's access token endpoint. Assert that when GitHub returns a valid token, the procedure encrypts it, stores it in DB, fetches GitHub user info, and returns `{ status: "success", username, avatarUrl }`. Assert that when GitHub returns `authorization_pending`, the procedure returns `{ status: "pending" }` and does not write to DB.
- **`aiProvider.disconnect`** — integration test: insert an `ai_provider` row, call disconnect, assert the row is deleted and the procedure returns success. Assert that calling disconnect for a non-existent provider does not throw.
- **`aiProvider.list`** — unit test: assert that the raw encrypted token is never present in the response, only `username` and `avatarUrl` from metadata.
- **AES-256-GCM encrypt/decrypt helper** — unit test: assert that `decrypt(encrypt(plaintext)) === plaintext`, and that different calls produce different IVs (non-deterministic ciphertext).

## Out of Scope

- Model selection UI (ai_model_assignment read/write)
- OpenAI, Google, Anthropic API key input and validation
- GitHub Copilot token caching strategy (relevant when chat feature is built)
- Enforcing that a User must have a connected provider before accessing chat
- Admin view of which Users have connected providers
- Revoking the GitHub OAuth token on GitHub's side when disconnecting (currently only deletes DB row)
- Multiple GitHub accounts per User
- Audit log for connect/disconnect actions
- Password change or account management features (were in the removed Account tab)
- Notification preferences (were in the removed Notifications tab)

## Further Notes

- The `client_id` `Iv1.b507a08c87ecfe98` is a well-known public identifier used by Copilot integrations. It does not require a client secret — device flow is designed for public clients.
- The Copilot API token (`/copilot_internal/v2/token`) is short-lived (~30 min). It must be re-fetched from the stored GitHub token at chat-time. The GitHub token itself is long-lived and stored encrypted in `ai_provider`.
- The `metadata` jsonb column on `ai_provider` stores non-sensitive display info (GitHub username, avatar URL). This avoids re-fetching GitHub user info on every page load.
- Removing the Account and Notifications tabs removes all React Hook Form usage from the settings feature — the remaining Profile tab uses TanStack Form, which is the project standard for new work.
