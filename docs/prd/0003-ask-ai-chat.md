# Ask AI Chat

## Problem Statement

Nhân viên muốn hỏi đáp nhanh về nghiệp vụ, quy trình, chính sách công ty ngay trong internal tooling platform. Sau khi đã kết nối GitHub Copilot ở Settings, không có nơi nào trong app để thực sự dùng model đó. Nhân viên phải thoát sang các công cụ bên ngoài (ChatGPT, Copilot.com) gây gián đoạn workflow và không có context công ty.

## Solution

Thêm tính năng **Ask AI** — một giao diện chat tích hợp sẵn trong platform, cho phép Employee hỏi đáp với AI model thông qua GitHub Copilot Enterprise. AI được cấu hình với system prompt mang context nghiệp vụ công ty, giúp câu trả lời phù hợp hơn với nội dung nội bộ. Tính năng được truy cập qua route `/ask-ai` là mục top-level trong sidebar navigation.

## User Stories

1. As an **Employee**, I want a dedicated "Ask AI" page in the main navigation, so that I can quickly start chatting with the AI from anywhere in the app.
2. As an **Employee**, I want to type a question and get a streaming response from the AI, so that I don't have to wait for the full response before reading it.
3. As an **Employee**, I want the AI's response to render markdown (including code blocks, lists, headers), so that structured answers are easy to read.
4. As an **Employee**, I want to see quick-start suggestion chips on the empty chat screen, so that I have prompts to get started without knowing what to ask.
5. As an **Employee**, I want to pick which Copilot model responds to my messages, so that I can choose between speed and capability.
6. As an **Employee**, I want the model I selected to be remembered across sessions, so that I don't have to re-pick it every time I open the chat.
7. As an **Employee**, I want my conversation to survive a page refresh, so that I don't lose progress when the browser reloads.
8. As an **Employee**, I want a "New Chat" button to clear the conversation and start fresh, so that I can switch topics cleanly.
9. As an **Employee**, I want to see a loading indicator while the AI is responding, so that I know the system is working.
10. As an **Employee**, I want to see an inline error when the AI fails to respond, so that I know something went wrong and can retry.
11. As an **Employee**, I want a "Retry" button on a failed message, so that I can resend without retyping my question.
12. As an **Employee**, I want to see a clear prompt to connect GitHub Copilot if I haven't yet, so that I understand why the chat is unavailable and know exactly how to fix it.
13. As an **Employee**, I want an auth error to link me directly to AI Providers settings, so that I can reconnect my GitHub account without hunting through menus.
14. As an **Employee**, I want the conversation to auto-scroll to the latest message as the AI streams, so that I always see the response as it arrives.
15. As an **Employee**, I want to press Enter to submit a message, so that I can chat without reaching for the mouse.
16. As an **Employee**, I want the submit button to be disabled while the AI is streaming, so that I don't accidentally send duplicate messages.
17. As an **Employee**, I want the AI's answers to be grounded in company context (processes, policies, domain knowledge), so that answers are relevant rather than generic.
18. As an **Employee**, I want to see the list of available Copilot models dynamically, so that I always have access to the latest models available through my Copilot subscription.
19. As an **Employee**, I want the chat interface to match the rest of the app's design system, so that the experience is consistent.
20. As an **Admin**, I want the chat endpoint to require authentication, so that only logged-in Users can access Copilot API resources.
21. As an **Admin**, I want each User's Copilot token to be used for their own requests only, so that access is per-User and tokens are not shared.
22. As an **Employee**, I want the AI to respond in the same language I write in, so that I can ask questions in Vietnamese or English comfortably.

## Implementation Decisions

### Route and Navigation

- New top-level route `/ask-ai` accessible to all authenticated Users.
- Sidebar navigation gains an "Ask AI" entry (top-level, between Dashboard and Departments).
- Page uses the same authenticated layout shell as other top-level routes.

### Backend: Chat Streaming Endpoint

- New standalone Hono route `POST /ai/chat` replacing the existing `/ai` boilerplate.
- Authentication: extract session from the request using Better-Auth session API; return `401` if no session.
- If the User has no connected GitHub Copilot AIProvider, return `403` with a machine-readable error code (`COPILOT_NOT_CONNECTED`) so the client can show a contextual inline error.
- Request body: `{ messages: UIMessage[], model: string }`.
- Uses `streamText` from the Vercel AI SDK with a custom `openai`-compatible provider pointed at the Copilot chat completions endpoint.
- Response: `toUIMessageStreamResponse()` — standard AI SDK streaming format consumed by `useChat` on the frontend.
- System prompt: a business-aware constant defined in the server module. Does not contain company-specific documents yet; that is a future RAG concern.

### Backend: Copilot Session Token Cache

- A module (`CopilotSessionCache`) wraps an in-memory `Map<userId, { token: string, endpoint: string, expiresAt: number }>`.
- On each chat request: check cache; if present and not within 60 seconds of expiry, use cached token; otherwise call `GET https://api.github.com/copilot_internal/v2/token` with the User's decrypted GitHub token to obtain a fresh session token + endpoint URL.
- Cache is keyed by `userId` so tokens are never shared across Users.
- Cache is lost on server restart; the next request transparently re-fetches from GitHub.

### Backend: `aiProvider.listCopilotModels` Procedure

- New `protectedProcedure` in the `aiProvider` router.
- Fetches available models from the Copilot models endpoint using the User's session token (via `CopilotSessionCache`).
- Returns `{ id: string, name: string, vendor: string }[]` — only chat-capable models.
- If the User has no Copilot AIProvider, throws `FORBIDDEN`.

### Backend: `aiModelAssignment` Router

Two new `protectedProcedure`s in a new `aiModelAssignment` router:

- `aiModelAssignment.get({ purpose: ModelPurpose })` — returns the current AIModelAssignment for the requesting User and given purpose, or `null` if none set. Returns `{ model: string, providerId: string } | null`.
- `aiModelAssignment.set({ purpose: ModelPurpose, model: string, providerId: string })` — upserts an AIModelAssignment row using the `(userId, purpose)` unique constraint.

The `aiModelAssignment` router is exported from `packages/api` alongside the existing `aiProvider` router.

### Frontend: AI Elements Components

- Install AI Elements (shadcn-style local components) into `apps/web` using the official CLI (`npx ai-elements@latest`).
- Components used in the Ask AI feature: `Conversation`, `ConversationContent`, `ConversationScrollButton`, `Message`, `MessageContent`, `MessageResponse` (includes markdown + code highlighting), `PromptInput`, `PromptInputBody`, `PromptInputTextarea`, `PromptInputSubmit`, `PromptInputFooter`, `PromptInputTools`, `ModelSelector` and its compound subcomponents, `Suggestion`, `Suggestions`.
- Components explicitly not used in this phase: `MessageBranch*`, `Attachment*`, `Reasoning*`, `Sources*`, `SpeechInput`, `usePromptInputAttachments`.

### Frontend: Chat State (`useChat`)

- Uses `useChat` from `@ai-sdk/react` for all streaming state management (messages, input, status, error).
- `api` option points to `POST /ai/chat` on the server (via the existing `VITE_SERVER_URL` env var).
- `body` option passes the selected model ID with every request.
- On error, the hook's `error` state drives the inline error UI inside the assistant message bubble.

### Frontend: IndexedDB Persistence (Dexie)

- A Dexie database (`AskAiDb`) with two object stores:
  - `conversations`: `{ id, title, createdAt, updatedAt }`
  - `messages`: `{ id, conversationId, role, content, createdAt }`
- On mount, the current conversation (most recent by `updatedAt`) is loaded and passed as `initialMessages` to `useChat`.
- `onFinish` callback of `useChat` persists each completed message pair to IndexedDB.
- "New Chat" creates a new conversation record and clears `useChat` state.
- A `useAskAiDb` hook encapsulates all Dexie access so the page component stays declarative.

### Frontend: Model Selection

- On page load, fetch available models via `aiProvider.listCopilotModels` and the saved preference via `aiModelAssignment.get({ purpose: "chat" })`.
- Default to the first model in the list if no preference is saved.
- When the user picks a model via `ModelSelector`, call `aiModelAssignment.set` to persist the selection and update local state.
- The selected model ID is sent with every chat request in the `body` option of `useChat`.

### Frontend: Empty State (No Copilot Connected)

- On page load, also call `aiProvider.list` to check if a `github_copilot` AIProvider exists for the User.
- If none: render a centered empty state instead of the chat UI — icon, heading "Connect GitHub Copilot to start chatting", body text explaining the purpose, and a button linking to `/settings/ai-providers`.

### Frontend: Error Handling

- Network / server errors: shown inline below the last user message as a styled error bubble with the error message and a "Retry" button that calls `reload()` from `useChat`.
- Auth-specific errors (`COPILOT_NOT_CONNECTED`): error bubble includes a link to `/settings/ai-providers`.
- No toast notifications for chat errors (toasts are for transient actions; inline errors stay attached to the failed message).

### Frontend: Feature Layout

Feature code lives under `apps/web/src/features/ask-ai/`:

- `index.tsx` — page component
- `components/` — chat-specific compositions (input bar, message list, empty state, model picker wiring)
- `hooks/` — `useAskAiDb`, `useModelAssignment`

## Testing Decisions

Good tests for this feature test observable behavior — what the User sees and what data ends up in the database — not internal implementation details like which function was called.

**Modules to test:**

- `CopilotSessionCache` — unit test: verify cache hit vs miss logic, verify expiry boundary (token within 60 s of expiry triggers refresh), verify tokens are keyed per userId and not shared.
- `aiModelAssignment` router procedures — integration test: `set` then `get` round-trip returns the same value; `set` on duplicate purpose upserts (not duplicates); unauthorized call throws.
- `aiProvider.listCopilotModels` — integration test with mocked Copilot `/models` endpoint: returns correctly shaped `{ id, name, vendor }[]`; throws `FORBIDDEN` when no AIProvider exists.
- `POST /ai/chat` Hono route — integration test with mocked `streamText`: returns `401` with no session; returns `403` with error code when Copilot not connected; passes correct model and messages to `streamText`; streams response correctly.
- `useAskAiDb` hook — unit test with fake IndexedDB (e.g. `fake-indexeddb`): verify load-on-mount returns last conversation; verify new message is persisted after `onFinish`; verify "new chat" creates new conversation.

**Prior art in the codebase:**

- `config-drawer.test.tsx` and `confirm-dialog.test.tsx` show the testing pattern for UI components (React Testing Library).
- `use-table-url-state.test.ts` shows the pattern for hook unit tests.
- No server-side integration test prior art exists yet; follow the same Hono + supertest or Hono test client pattern used by other Hono projects.

## Out of Scope

- **Conversation history sidebar** — no UI to browse past conversations. The Dexie schema supports it; the sidebar UI is deferred.
- **File attachments** — no file upload in the chat input in this phase.
- **Speech input** — `SpeechInput` component not wired up.
- **Message branching** — no edit-and-regenerate message variants.
- **Reasoning / thinking display** — no `Reasoning*` components.
- **Source citations** — no `Sources*` components.
- **RAG over company documents** — system prompt is a static string. Document ingestion and retrieval are future work.
- **Other AI providers** (OpenAI, Google, Anthropic) — only GitHub Copilot is supported in this phase. The `AIProvider` and `AIModelAssignment` schema is already multi-provider.
- **Admin-configurable system prompt** — the system prompt is a hardcoded server constant.
- **Server-side conversation persistence** — conversations are stored only in the User's browser via IndexedDB.
- **Embedding and vision model assignment** — only `chat` purpose is exercised in this feature. The `embedding` and `vision` ModelPurpose values exist in the schema but have no UI.
- **Multi-tenancy** — explicitly out of scope for the entire platform.

## Further Notes

- The Copilot chat completions endpoint is OpenAI-compatible. The Vercel AI SDK's `createOpenAI` provider (pointed at the Copilot endpoint with the session token) handles the protocol without custom implementation.
- The short-lived Copilot session token (typically ~30 min) is obtained by calling `GET https://api.github.com/copilot_internal/v2/token` with the User's long-lived GitHub token. The `Copilot-Integration-Id` header must be set correctly on this request.
- The model list from Copilot's `/models` endpoint may include non-chat models (embedding, completion). Filter to only `capabilities.type === "chat"` models before returning to the client.
- The system prompt should be reviewed and expanded as the company's knowledge base grows. The future RAG approach (injecting `.md` documents as context) will augment but not replace the base system prompt.
- When the User's GitHub token is revoked (e.g. they disconnected Copilot from Settings), the next chat request will fail at the `copilot_internal/v2/token` step. Surface this as the `COPILOT_NOT_CONNECTED` error code so the client renders the re-connect prompt.
