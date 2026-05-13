# 5. System AI Providers and Ollama Integration

Date: 2026-05-13
Status: Accepted

## Context

We need to support local AI models via Ollama. Unlike GitHub Copilot (which requires per-user authentication and tokens stored in the `AIProvider` table), Ollama is hosted internally and does not require per-user credentials. We needed to decide how to represent and configure this in our data model and user interface.

## Decisions

1. **Environment-driven System Providers:** Ollama will be configured globally via server environment variables (e.g., `OLLAMA_BASE_URL`). We will not build an Admin UI or a `SystemSettings` database table for this. It is treated as an infrastructure concern.
2. **Nullable `providerId` and Namespaced `modelId`:** When a user selects a system model (like Ollama) in their settings, the `AIModelAssignment` record will store `providerId: null`. The `modelId` will be namespaced (e.g., `ollama:llama3`, `copilot:gpt-4o`) so the backend router knows which provider to execute the run against.
3. **Dynamic Model Fetching:** Available Ollama models will be fetched dynamically from the Ollama API (`GET /api/tags` on the base URL) rather than hardcoded in the database.
4. **Server-side Aggregation:** The backend will expose a single `GET /api/models` endpoint that aggregates Copilot models (if the user has an active token) and the system Ollama models into a single unified list for the frontend.

## Consequences

- **Pros:** No schema migrations needed for the `AIProvider` table (no dummy models). Minimal frontend complexity (deals with one list of models). Easy to add new Ollama models by just downloading them to the host server without database updates. Perfectly aligns with Vercel AI SDK's provider string routing.
- **Cons:** We rely on application logic rather than strict foreign key integrity in `AIModelAssignment` for system models (it relies on the string namespace being valid). Admins cannot change the Ollama URL via the web UI without altering the server environment.
