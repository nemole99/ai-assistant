# Document Management & Knowledge Base

## Problem Statement

Nhân viên không có nơi tập trung để tra cứu tài liệu nội bộ của công ty (nội quy, quy trình, chính sách). Tài liệu hiện tại nằm rải rác ở Google Drive, email, hoặc nhóm chat — không có trong platform nội bộ, khó tìm kiếm, và AI chatbot không thể khai thác. Admin cũng không có công cụ để quản lý và phân loại tài liệu một cách hệ thống.

## Solution

Xây dựng tính năng **Document Management** — cho phép Admin upload tài liệu PDF lên hệ thống, phân loại theo **DocumentCategory**, và tự động chuyển đổi sang Markdown qua background queue để Employee có thể đọc trực tuyến. File gốc được lưu trên **MinIO**, nội dung Markdown được lưu trong Postgres để phục vụ AI wiki search sau này. Giai đoạn 1 chỉ bao gồm tài liệu global (company-wide); tài liệu theo Project là giai đoạn tiếp theo.

## User Stories

**DocumentCategory Management (Admin)**

1. As an **Admin**, I want to create a document category with a name, color, and optional description, so that I can organize documents into meaningful groups.
2. As an **Admin**, I want to see a list of all document categories, so that I can review and manage them.
3. As an **Admin**, I want to edit a category's name, color, and description, so that I can keep the taxonomy accurate.
4. As an **Admin**, I want to delete a category that has no documents, so that I can clean up unused categories.
5. As an **Admin**, I want to be blocked from deleting a category that still has documents attached, so that I don't accidentally orphan documents.
6. As an **Admin**, I want each category to display its color as a visual badge, so that I can quickly distinguish categories in the UI.

**Document Upload & Management (Admin)**

7. As an **Admin**, I want to upload a PDF document by selecting a file from my computer, so that I can add company documents to the knowledge base.
8. As an **Admin**, I want a presigned upload URL flow so that the file is uploaded directly to MinIO (not proxied through the API server), so that large files don't bottleneck the server.
9. As an **Admin**, I want to give a document a title, assign it to a category, and optionally add a description before uploading, so that the document is properly labeled from the start.
10. As an **Admin**, I want the upload to reject files larger than 10MB, so that I get early feedback if I accidentally pick the wrong file.
11. As an **Admin**, I want the upload to reject non-PDF files, so that only supported formats enter the pipeline.
12. As an **Admin**, I want to see the document's processing status (Pending, Completed, Failed) in the document list, so that I know when a document is ready for employees to read.
13. As an **Admin**, I want to edit a document's title, category, and description after upload, so that I can correct mistakes without re-uploading.
14. As an **Admin**, I want to delete a document with a confirmation dialog, so that accidental deletions are prevented.
15. As an **Admin**, I want deleting a document to remove both the database record and the file from MinIO, so that storage is not wasted.
16. As an **Admin**, I want to retry a failed document conversion, so that I don't have to delete and re-upload the file just to trigger processing again.
17. As an **Admin**, I want to see the error message for a failed document, so that I understand why conversion failed.

**Document Reading (Employee)**

18. As an **Employee**, I want to see a list of all global company documents organized by category, so that I can find the document I'm looking for.
19. As an **Employee**, I want to filter documents by category, so that I can narrow down to a specific area.
20. As an **Employee**, I want to search documents by title, so that I can find a specific document without scrolling through a long list.
21. As an **Employee**, I want to open a document and read its content rendered as Markdown on the page, so that I can read it without opening a PDF reader.
22. As an **Employee**, I want to download the original PDF of a document, so that I can access the official, formatted version with company letterhead and signatures.
23. As an **Employee**, I want documents that are still being processed (status = Pending) to be hidden from my view, so that I don't see incomplete content.
24. As an **Employee**, I want to see each document's category badge with color, so that I can quickly scan and identify document types.
25. As an **Employee**, I want to see the upload date of each document, so that I know how current the information is.

## Implementation Decisions

### New Packages

- **`@workspace/storage`** — MinIO client instance and upload/download helpers (`putObject`, `presignedPutUrl`, `presignedGetUrl`, `deleteObject`). Shared between API server and worker.
- **`@workspace/queue`** — BullMQ queue definitions and Redis connection. Exports `documentQueue` (Queue instance) and queue name constants. Shared between API server (enqueue) and worker (consume).

### Database Schema Changes

**New table: `document_category`**
- `id`, `name` (unique), `color` (hex string), `description` (nullable), `createdAt`, `updatedAt`

**New table: `document`**
- `id`, `title`, `description` (nullable), `categoryId` (FK → `document_category`, required), `projectId` (FK → `project`, nullable — null = global), `status` (enum: `PENDING`, `COMPLETED`, `FAILED`), `mimeType`, `fileSize` (bytes), `objectKey` (MinIO path), `originalFilename`, `markdownContent` (nullable text), `errorMessage` (nullable), `uploadedBy` (FK → `user`), `createdAt`, `updatedAt`

MinIO object path convention: `global/{documentId}/original.pdf` for global documents, `projects/{projectId}/{documentId}/original.pdf` for project-scoped (future).

### Upload Flow (2-step presigned)

1. Admin calls `document.requestUpload({ filename, fileSize, mimeType, title, description, categoryId })` — server validates input, generates a presigned MinIO PUT URL (short TTL ~5 min), creates a Document record with status `PENDING`, returns `{ documentId, presignedUrl }`.
2. Client uploads the file directly to MinIO via the presigned URL.
3. Client calls `document.confirmUpload({ documentId })` — server verifies the object exists in MinIO, enqueues a BullMQ job `{ documentId }` on `documentQueue`.

### Background Worker (`apps/server/src/worker.ts`)

Separate Bun process entry point. Connects to the same Redis as the API server, registers a BullMQ `Worker` on `documentQueue`.

Job handler:
1. Fetch Document record from Postgres (bail if not found or not `PENDING`).
2. Download PDF from MinIO to a temp file.
3. Run `markitdown <tempfile>` as a subprocess (MarkItDown must be installed via `pip install 'markitdown[pdf]'` in the deployment environment).
4. Read stdout as markdown string.
5. Update Document: `markdownContent = <result>`, `status = COMPLETED`.
6. On any error: update Document `status = FAILED`, `errorMessage = <error message>`.
7. Clean up temp file.

BullMQ job config: 3 automatic retries with exponential backoff before marking as failed.

### API Router: `documentCategory`

New oRPC router in `packages/api/src/routers/document-category.ts`:
- `list` — `protectedProcedure` — returns all categories with document count
- `create` — `adminProcedure` — creates category
- `update` — `adminProcedure` — updates name/color/description
- `delete` — `adminProcedure` — blocks if category has documents; otherwise deletes

### API Router: `document`

New oRPC router in `packages/api/src/routers/document.ts`:
- `list` — `protectedProcedure` — returns documents with `status = COMPLETED` for employees; all statuses for admins. Supports filter by `categoryId`.
- `get` — `protectedProcedure` — returns a single document including `markdownContent`.
- `requestUpload` — `adminProcedure` — validates, creates DB record, returns presigned PUT URL.
- `confirmUpload` — `adminProcedure` — verifies MinIO object, enqueues job.
- `update` — `adminProcedure` — updates title, description, categoryId.
- `delete` — `adminProcedure` — deletes DB record + MinIO object.
- `retry` — `adminProcedure` — resets `status = PENDING`, clears `errorMessage`, re-enqueues job. Only valid when current status is `FAILED`.
- `getDownloadUrl` — `protectedProcedure` — returns a short-lived presigned GET URL for the original PDF.

### Environment Variables (additions)

```
MINIO_ENDPOINT=
MINIO_PORT=
MINIO_USE_SSL=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=
REDIS_URL=
```

### Frontend Feature Layout

Feature code lives under `apps/web/src/features/documents/`:
- Admin view: category management + document list with status badges + upload form
- Employee view: document list (completed only) + document reader page

Route structure:
- `/documents` — list view (all authenticated users)
- `/documents/:id` — reader view (all authenticated users)
- `/admin/documents` — admin management view
- `/admin/documents/categories` — category CRUD

## Testing Decisions

Good tests for this feature verify observable behavior from the outside — what gets written to the database, what gets enqueued, what HTTP status is returned — not internal implementation details.

**Modules to test:**

- **`@workspace/storage`** — unit tests with MinIO mock: `presignedPutUrl` returns a valid URL; `deleteObject` calls the correct bucket + key.
- **`documentCategory` router** — integration tests: `delete` on a category with documents throws; `delete` on empty category succeeds; `create` with duplicate name throws.
- **`document` router** — integration tests: `requestUpload` creates a PENDING record and returns a presigned URL; `confirmUpload` enqueues a job; `retry` on non-FAILED document throws; `list` returns only COMPLETED documents for non-admin users.
- **Worker job handler** — unit tests with mocked MinIO + mocked `markitdown` subprocess: successful conversion updates status to COMPLETED and sets `markdownContent`; subprocess failure updates status to FAILED and sets `errorMessage`.

**Prior art:**
- `packages/api/src/routers/organization.ts` and `project.ts` show the oRPC router + procedure pattern to follow.
- No worker/queue test prior art exists yet; follow a similar pattern to the Hono integration tests.

## Out of Scope

- **Project-scoped documents** — `projectId` column exists in schema for future use; UI and access control for project documents are deferred.
- **Non-PDF file formats** — Word, Excel, PowerPoint, images with OCR are deferred. `mimeType` field supports future expansion.
- **AI wiki search / RAG** — `markdownContent` is stored and ready; the retrieval, embedding, and chat integration are future work.
- **Document versioning** — no version history; re-uploading replaces the document.
- **Full-text search** — basic title search only in phase 1; Postgres full-text or vector search is future work.
- **Document preview in-browser** — PDF rendering in the browser (via PDF.js) is deferred; only markdown render + download is in scope.
- **Notifications** — no email or in-app notification when a document finishes processing.
- **Bulk upload** — single file upload only.
- **Access audit log** — no tracking of who viewed which document.

## Further Notes

- MarkItDown (Microsoft, MIT license, 123k GitHub stars) is the chosen PDF → Markdown tool. It is a Python CLI tool (`markitdown file.pdf`) invoked via subprocess from the BullMQ worker. Install with `pip install 'markitdown[pdf]'`. The worker Dockerfile must include Python 3.10+.
- The presigned PUT URL has a short TTL (~5 min). If the client fails to upload within that window, `confirmUpload` will fail (MinIO object won't exist). The Admin should simply retry the upload from the beginning.
- MinIO is S3-compatible. The `minio` npm SDK is used (not `@aws-sdk/client-s3`) since we are committed to self-hosted MinIO.
- BullMQ is backed by Redis. Redis is a new infrastructure dependency. See ADR-0006 for the rationale over pg-boss.
- The worker and API server are separate Bun processes but share the same Docker image with different entry points (`src/index.ts` vs `src/worker.ts`).
