# Wiki Ingestion Pipeline & RAG Chat

## Problem Statement

Nhân viên có thể upload tài liệu PDF và đọc nội dung markdown trên web, nhưng AI chatbot không khai thác được nội dung đó. Khi hỏi AI về quy trình, best practice, technical spec, hay tiến độ dự án — AI trả lời chung chung vì không có context từ tài liệu công ty. Kiến thức nằm rải rác trong từng PDF, không được tổng hợp, cross-reference, hay cập nhật tự động. Nhân viên phải tự đọc từng tài liệu và tự kết nối thông tin.

## Solution

Xây dựng **IngestionPipeline** — khi một Document được upload và convert xong markdown, hệ thống tự động chạy pipeline 3 phase (EXTRACT → PLAN → COMMIT) để tạo ra **WikiPage** — các bài viết markdown do LLM biên soạn, tổng hợp kiến thức từ nhiều Document. WikiPage được chunk và embed (pgvector) để phục vụ **RAG Chat** — mỗi câu hỏi trong Ask AI được vector search trên WikiPageChunk, inject context vào prompt, và LLM trả lời kèm citation nguồn. Admin cấu hình pipeline AI provider/model qua UI (**SystemAIConfig**).

## User Stories

**SystemAIConfig Management (Admin)**

1. As an **Admin**, I want to configure the AI provider and model for the ingestion pipeline via the web UI, so that the pipeline uses the correct LLM without requiring server redeployment.
2. As an **Admin**, I want to enter an API key for the pipeline provider (e.g., OpenAI), so that the pipeline worker can authenticate with the AI service.
3. As an **Admin**, I want the API key to be stored encrypted in the database, so that credentials are not exposed in plaintext.
4. As an **Admin**, I want to configure the embedding model separately from the text generation model, so that each purpose uses the most appropriate model.
5. As an **Admin**, I want to see a clear indication when the pipeline is not configured, so that I understand why uploaded documents are not being processed into the wiki.
6. As an **Admin**, I want to test the connection to the configured provider before saving, so that I know the API key and model are valid.

**Ingestion Pipeline (Automatic)**

7. As the **system**, when a Document status changes to `COMPLETED` (markdown ready) and SystemAIConfig is configured, the IngestionPipeline should automatically trigger, so that wiki generation requires no manual intervention.
8. As the **system**, the EXTRACT phase should chunk the Document markdown by sections and use the LLM to extract key entities, concepts, and claims from each chunk, so that structured knowledge is identified.
9. As the **system**, the PLAN phase should compare extracted knowledge against existing WikiPages and decide which pages to create and which to update, so that the wiki stays consistent and avoids duplication.
10. As the **system**, the COMMIT phase should write or update WikiPages, generate embeddings for each chunk, and store them in pgvector, so that the knowledge is searchable.
11. As the **system**, the Document status should progress through `INGESTING` → `INGESTED` (success) or `INGEST_FAILED` (error), so that pipeline progress is visible to Admin.
12. As an **Admin**, I want to see `INGESTING`, `INGESTED`, and `INGEST_FAILED` statuses in the document list, so that I know the pipeline state of each document.
13. As an **Admin**, I want to retry a document with `INGEST_FAILED` status, so that transient LLM errors can be recovered without re-uploading.
14. As the **system**, if SystemAIConfig is not configured, documents should remain at `COMPLETED` status without error, so that the existing document reading flow is unaffected.

**WikiPage Management (Admin)**

15. As an **Admin**, I want to see a list of all WikiPages with their titles and source Document count, so that I can monitor what the pipeline has produced.
16. As an **Admin**, I want to delete a WikiPage (with confirmation), so that I can remove incorrect or outdated compiled knowledge.
17. As an **Admin**, I want deleting a WikiPage to also delete its chunks and embeddings, so that stale content is not returned in search results.

**RAG Chat (Employee)**

18. As an **Employee**, I want the AI to answer questions using knowledge from uploaded company documents, so that I get accurate, company-specific answers instead of generic responses.
19. As an **Employee**, I want every chat message to automatically search relevant wiki content, so that I don't have to explicitly ask the AI to "look it up."
20. As an **Employee**, I want the AI's answer to cite which WikiPages it used, so that I can verify the information.
21. As an **Employee**, I want to click a citation to view the full WikiPage content, so that I can read the broader context beyond the AI's excerpt.
22. As an **Employee**, I want the AI to still work normally if no wiki content exists yet (no documents uploaded, pipeline not configured), so that the basic chat experience is not broken.

**WikiPage Reading (Employee)**

23. As an **Employee**, I want to view a WikiPage's full markdown content when I click a citation, so that I can verify the AI's answer against the source material.
24. As an **Employee**, I want to see which Documents contributed to a WikiPage, so that I can trace compiled knowledge back to the original source.

## Implementation Decisions

### Database Schema Changes

**Extend `document_status` enum** — add three values: `INGESTING`, `INGESTED`, `INGEST_FAILED`. The existing `PENDING`, `COMPLETED`, `FAILED` remain unchanged.

**New enum: `system_purpose`** — values: `pipeline_text`, `pipeline_embedding`.

**New table: `system_ai_config`** — `id`, `purpose` (system_purpose enum, unique), `providerType` (text — e.g. `openai`, `anthropic`, `ollama`), `apiKey` (text, encrypted via existing `encrypt`/`decrypt` from `@workspace/db/crypto`), `modelId` (text), `baseUrl` (text, nullable — for Ollama or custom endpoints), `createdAt`, `updatedAt`. Singleton per purpose (max 2 rows).

**New table: `wiki_page`** — `id`, `title` (text, unique), `slug` (text, unique — URL-friendly), `content` (text — full markdown), `createdAt`, `updatedAt`.

**New table: `wiki_page_source`** — many-to-many join: `wikiPageId` (FK → wiki_page, cascade delete), `documentId` (FK → document, set null on delete), composite PK. Tracks which Documents contributed to each WikiPage.

**New table: `wiki_page_chunk`** — `id`, `wikiPageId` (FK → wiki_page, cascade delete), `content` (text — the chunk text), `chunkIndex` (integer — ordering), `embedding` (vector(1536) — pgvector column, dimension depends on embedding model; 1536 for OpenAI `text-embedding-3-small`). Requires `CREATE EXTENSION IF NOT EXISTS vector;` migration. Index: `USING ivfflat (embedding vector_cosine_ops)` or `USING hnsw (embedding vector_cosine_ops)`.

### Ingestion Pipeline Architecture

The pipeline runs inside the existing BullMQ worker (`apps/server/src/worker.ts`). A new queue `wiki-ingestion` is added alongside the existing `document-processing` queue.

When the `document-processing` job completes successfully (status → `COMPLETED`), if SystemAIConfig is configured, it enqueues a `wiki-ingestion` job with `{ documentId }`.

Pipeline phases run sequentially within a single BullMQ job:

1. **EXTRACT** — Split `document.markdownContent` into chunks by heading boundaries (## or ###). For each chunk, call the `pipeline_text` LLM with a structured extraction prompt that returns JSON: `{ entities: string[], concepts: string[], claims: string[], summary: string }`. Save intermediate extractions in the job's progress data (for crash recovery).

2. **PLAN** — Aggregate all extractions. Query existing WikiPage titles. Call the `pipeline_text` LLM with the extractions + existing page list, asking it to produce a plan: `{ create: [{ title, slug, relevantChunks }], update: [{ pageId, title, relevantChunks }] }`.

3. **COMMIT** — For each page in the plan:
   - **Create**: call the LLM to write the full markdown content, passing the relevant source chunks as context. Insert WikiPage row + WikiPageSource rows. Chunk the written content into paragraphs, embed each chunk, insert WikiPageChunk rows.
   - **Update**: fetch existing WikiPage content, call the LLM to merge new knowledge into existing content. Update WikiPage row, update WikiPageSource rows. Delete old WikiPageChunk rows, re-chunk, re-embed, re-insert.

On success: Document status → `INGESTED`. On any error: Document status → `INGEST_FAILED`, store error message.

### SystemAIConfig API

New oRPC router `packages/api/src/routers/system-ai-config.ts`:

- `get({ purpose })` — `adminProcedure` — returns config for a purpose (null if not set). API key is returned masked (last 4 chars only).
- `upsert({ purpose, providerType, apiKey, modelId, baseUrl? })` — `adminProcedure` — creates or updates config. Encrypts API key before storing.
- `delete({ purpose })` — `adminProcedure` — removes config for a purpose.
- `testConnection({ purpose })` — `adminProcedure` — attempts a lightweight API call (e.g., list models or a trivial completion) to verify credentials work.

### WikiPage API

New oRPC router `packages/api/src/routers/wiki-page.ts`:

- `list` — `protectedProcedure` — returns all WikiPages with title, slug, source count, updatedAt. Paginated.
- `get({ id })` — `protectedProcedure` — returns full WikiPage with content and source Documents.
- `getBySlug({ slug })` — `protectedProcedure` — same as `get` but by slug (for URL-based access).
- `delete({ id })` — `adminProcedure` — deletes WikiPage + cascades to chunks and sources.
- `search({ query, limit? })` — `protectedProcedure` — embeds the query using `pipeline_embedding` SystemAIConfig, performs cosine similarity search on WikiPageChunk, returns top-N results with WikiPage metadata.

### RAG Chat Enhancement

Modify `apps/server/src/routes/ai.ts`:

1. Before calling `streamText`, call `wikiPage.search({ query: lastUserMessage })` to get top-N relevant chunks.
2. If SystemAIConfig for `pipeline_embedding` is not configured or no chunks are found, proceed without RAG context (graceful degradation).
3. Inject retrieved chunks into the system prompt as structured context with WikiPage titles and chunk content.
4. Add instruction in system prompt: "Cite your sources using the format [WikiPage Title] when you use information from the provided context."
5. Return citation metadata alongside the streamed response (WikiPage IDs and titles used as context) so the frontend can render clickable citation links.

### Frontend: SystemAIConfig Admin Page

New settings page at `/settings/system-ai` (Admin only):

- Two sections: "Pipeline Text Model" and "Pipeline Embedding Model"
- Each section: provider type select, API key input (password field), model ID input, optional base URL
- Save button per section, test connection button per section
- Status indicator showing whether each purpose is configured

### Frontend: RAG Chat Citations

Enhance the existing Ask AI chat:

- After each AI response, render a "Sources" section showing cited WikiPage titles as clickable chips/links.
- Clicking a citation opens a side panel or modal showing the full WikiPage content rendered as markdown.
- If no wiki content exists, the chat works exactly as before (no visual change).

### Frontend: WikiPage Admin List

New admin page at `/admin/wiki` (Admin only):

- Table of WikiPages: title, source count, created date, updated date
- Delete action with confirmation dialog
- Link to view full WikiPage content

### Environment Variables (additions)

No new environment variables required. Pipeline AI credentials are stored in the database (SystemAIConfig), not in env vars. The `pgvector` extension must be enabled in the Postgres instance.

## Testing Decisions

Good tests verify observable behavior — what gets written to the database, what gets returned from the API, what the user sees — not implementation internals.

**Modules to test:**

- **`system-ai-config` router** — integration tests: `upsert` stores encrypted API key; `get` returns masked key; `delete` removes config; `upsert` with same purpose updates rather than duplicates; non-admin access throws.

- **`wiki-page` router** — integration tests: `list` returns pages with source counts; `get` returns full content; `delete` cascades to chunks; `search` returns results ranked by similarity (using a test embedding).

- **IngestionPipeline job handler** — unit tests with mocked LLM and mocked DB: EXTRACT phase produces structured JSON from markdown chunks; PLAN phase compares against existing pages; COMMIT phase creates/updates WikiPage rows; failure at any phase sets `INGEST_FAILED` status and error message; successful completion sets `INGESTED` status.

- **RAG chat endpoint** — integration test with mocked embedding + mocked wiki search: when chunks exist, they appear in the prompt context; when no chunks exist, chat works normally without context; citation metadata is included in response.

- **DocumentStatus transition** — unit test: after document-processing job completes, wiki-ingestion job is enqueued only when SystemAIConfig is configured.

**Prior art:**

- `packages/api/src/routers/document.ts` — router CRUD pattern with protectedProcedure / adminProcedure
- `apps/server/src/worker.ts` — BullMQ worker pattern for background jobs
- `packages/db/src/crypto.ts` — encryption pattern for sensitive data (API keys)
- `apps/web/src/components/config-drawer.test.tsx`, `confirm-dialog.test.tsx` — UI component test pattern

## Out of Scope

- **Jira ticket sync** — ingestion of Jira bugs/tasks/reopened tickets is deferred to a future phase. Phase 1 handles only static uploaded documents.
- **Human review gate** — no Admin approval step before wiki changes are applied. Pipeline runs fully automatic.
- **WikiPage revisions** — no version history of WikiPage edits. Content is updated in place.
- **WikiLink tracking table** — no `wiki_link` table for graph queries. WikiPages use inline markdown links only.
- **WikiPage categorization** — no categories or tags on WikiPages. Access is through search only.
- **Browsable wiki route** — no dedicated `/wiki` route for employees to browse all WikiPages. Phase 1 focuses on citations in Ask AI chat and click-to-view. A browse page is future work.
- **Admin editing of WikiPages** — Admin can only delete WikiPages, not edit content. LLM owns all wiki content.
- **Project-scoped Document visibility** — all documents and WikiPages are visible to all authenticated employees. Per-project access control is deferred.
- **Document deletion cascade to WikiPages** — deleting a Document does not affect WikiPages that were compiled from it. Knowledge persists in the wiki.
- **Conversation history sidebar in Ask AI** — already deferred from the Ask AI PRD.
- **Non-PDF file formats** — already deferred from the Document Management PRD.
- **Bulk document ingestion backfill** — no mechanism to re-process existing documents. All documents in this dev phase start from scratch.

## Further Notes

- **pgvector** must be installed in the Postgres instance. For local development with Docker, use the `pgvector/pgvector:pg16` image. Add a migration that runs `CREATE EXTENSION IF NOT EXISTS vector;`.
- **Embedding dimension** depends on the model configured in SystemAIConfig. OpenAI `text-embedding-3-small` produces 1536-dimensional vectors. Ollama `nomic-embed-text` produces 768. The `wiki_page_chunk.embedding` column dimension should match the configured model. If the Admin changes the embedding model, existing embeddings become incompatible — the system should detect dimension mismatch and prompt the Admin to re-embed all WikiPages (or handle this automatically).
- **LLM cost** is managed by the Admin (they provide their own API key). The pipeline is not latency-sensitive — it runs async in the BullMQ worker. Use `gpt-4o-mini` or similar cost-effective models for extraction and writing.
- **Chunking strategy for EXTRACT**: split on heading boundaries (`##`, `###`). If a document has no headings, fall back to splitting on double newlines with a max chunk size (~2000 tokens). This is a heuristic — the exact strategy can be tuned based on output quality.
- **Chunking strategy for WikiPageChunk**: split written WikiPage content into paragraphs (double newline boundaries) for embedding. Each chunk should be 200-500 tokens for good retrieval precision.
- **RAG top-N**: start with N=5 chunks. This is a tuning parameter — can be adjusted based on answer quality vs token cost.
- The `wiki-ingestion` BullMQ queue should have concurrency 1 to avoid race conditions when two documents want to update the same WikiPage simultaneously. The `document-processing` queue can remain at concurrency 2 (it doesn't write to WikiPage).
- The Vercel AI SDK (`ai` package) already supports OpenAI and Anthropic providers via `@ai-sdk/openai` and `@ai-sdk/anthropic`. The worker can use the same SDK for LLM calls (non-streaming `generateText` / `generateObject` for structured extraction).
