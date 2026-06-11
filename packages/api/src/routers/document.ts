import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { document, documentCategory } from "@workspace/db/schema/auth";
import {
  selectDocumentCategorySchema,
  selectDocumentSchema,
  updateDocumentSchema,
} from "@workspace/db/schema/validation";
import { documentQueue, wikiIngestionQueue } from "@workspace/queue";
import {
  deleteObject,
  documentObjectKey,
  objectExists,
  presignedGetUrl,
  presignedPutUrl,
} from "@workspace/storage";
import { and, eq, ilike, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, protectedProcedure } from "..";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const selectDocumentWithCategorySchema = selectDocumentSchema.extend({
  category: selectDocumentCategorySchema,
});

export const documentRouter = {
  confirmUpload: adminProcedure
    .input(z.object({ documentId: z.string() }))
    .output(selectDocumentSchema)
    .handler(async ({ input }) => {
      const [doc] = await db
        .select()
        .from(document)
        .where(eq(document.id, input.documentId))
        .limit(1);

      if (!doc) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      if (doc.status !== "PENDING") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Document is not in PENDING state",
        });
      }

      const exists = await objectExists(doc.objectKey);
      if (!exists) {
        throw new ORPCError("BAD_REQUEST", {
          message: "File not found in storage — upload may have failed",
        });
      }

      await documentQueue.add("process", { documentId: doc.id });

      return doc;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input }) => {
      const [doc] = await db
        .select({ objectKey: document.objectKey })
        .from(document)
        .where(eq(document.id, input.id))
        .limit(1);

      if (!doc) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      await db.delete(document).where(eq(document.id, input.id));

      try {
        await deleteObject(doc.objectKey);
      } catch {
        // Object may already be gone; DB record is already deleted so this is non-fatal
      }

      return { success: true };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(selectDocumentWithCategorySchema)
    .handler(async ({ input, context }) => {
      const isAdmin = context.session.user.role === "ADMIN";

      const [row] = await db
        .select({
          category: {
            color: documentCategory.color,
            createdAt: documentCategory.createdAt,
            description: documentCategory.description,
            id: documentCategory.id,
            name: documentCategory.name,
            updatedAt: documentCategory.updatedAt,
          },
          categoryId: document.categoryId,
          createdAt: document.createdAt,
          description: document.description,
          errorMessage: document.errorMessage,
          fileSize: document.fileSize,
          id: document.id,
          markdownContent: document.markdownContent,
          mimeType: document.mimeType,
          objectKey: document.objectKey,
          originalFilename: document.originalFilename,
          projectId: document.projectId,
          status: document.status,
          title: document.title,
          updatedAt: document.updatedAt,
          uploadedBy: document.uploadedBy,
        })
        .from(document)
        .innerJoin(
          documentCategory,
          eq(document.categoryId, documentCategory.id)
        )
        .where(eq(document.id, input.id))
        .limit(1);

      if (!row) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      const visibleStatuses = [
        "COMPLETED",
        "INGESTING",
        "INGESTED",
        "INGEST_FAILED",
      ] as const;
      if (
        !isAdmin &&
        !visibleStatuses.includes(
          row.status as (typeof visibleStatuses)[number]
        )
      ) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      return row;
    }),

  getDownloadUrl: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ url: z.string() }))
    .handler(async ({ input, context }) => {
      const isAdmin = context.session.user.role === "ADMIN";

      const [doc] = await db
        .select({
          objectKey: document.objectKey,
          originalFilename: document.originalFilename,
          status: document.status,
        })
        .from(document)
        .where(eq(document.id, input.id))
        .limit(1);

      if (!doc) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      const visibleStatuses = [
        "COMPLETED",
        "INGESTING",
        "INGESTED",
        "INGEST_FAILED",
      ] as const;
      if (
        !isAdmin &&
        !visibleStatuses.includes(
          doc.status as (typeof visibleStatuses)[number]
        )
      ) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      const url = await presignedGetUrl(
        doc.objectKey,
        300,
        doc.originalFilename
      );

      return { url };
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          categoryId: z.string().optional(),
          query: z.string().optional(),
        })
        .optional()
    )
    .output(z.array(selectDocumentWithCategorySchema))
    .handler(async ({ input, context }) => {
      const isAdmin = context.session.user.role === "ADMIN";

      const rows = await db
        .select({
          category: {
            color: documentCategory.color,
            createdAt: documentCategory.createdAt,
            description: documentCategory.description,
            id: documentCategory.id,
            name: documentCategory.name,
            updatedAt: documentCategory.updatedAt,
          },
          categoryId: document.categoryId,
          createdAt: document.createdAt,
          description: document.description,
          errorMessage: document.errorMessage,
          fileSize: document.fileSize,
          id: document.id,
          markdownContent: document.markdownContent,
          mimeType: document.mimeType,
          objectKey: document.objectKey,
          originalFilename: document.originalFilename,
          projectId: document.projectId,
          status: document.status,
          title: document.title,
          updatedAt: document.updatedAt,
          uploadedBy: document.uploadedBy,
        })
        .from(document)
        .innerJoin(
          documentCategory,
          eq(document.categoryId, documentCategory.id)
        )
        .where(
          and(
            isNull(document.projectId),
            isAdmin
              ? undefined
              : sql`${document.status} IN ('COMPLETED', 'INGESTING', 'INGESTED', 'INGEST_FAILED')`,
            input?.categoryId
              ? eq(document.categoryId, input.categoryId)
              : undefined,
            input?.query ? ilike(document.title, `%${input.query}%`) : undefined
          )
        )
        .orderBy(document.createdAt);

      return rows;
    }),

  requestUpload: adminProcedure
    .input(
      z.object({
        categoryId: z.string(),
        description: z.string().optional(),
        fileSize: z.number().int().positive().max(MAX_FILE_SIZE, {
          message: "File size must be 10 MB or less",
        }),
        filename: z.string().min(1),
        mimeType: z.literal("application/pdf", {
          message: "Only PDF files are supported",
        }),
        title: z.string().min(1),
      })
    )
    .output(z.object({ documentId: z.string(), presignedUrl: z.string() }))
    .handler(async ({ input, context }) => {
      const category = await db
        .select({ id: documentCategory.id })
        .from(documentCategory)
        .where(eq(documentCategory.id, input.categoryId))
        .limit(1);

      if (!category.length) {
        throw new ORPCError("NOT_FOUND", { message: "Category not found" });
      }

      const documentId = crypto.randomUUID();
      const objectKey = documentObjectKey(documentId);

      const uploadUrl = await presignedPutUrl(objectKey, 300);

      await db.insert(document).values({
        categoryId: input.categoryId,
        description: input.description ?? null,
        fileSize: input.fileSize,
        id: documentId,
        mimeType: input.mimeType,
        objectKey,
        originalFilename: input.filename,
        projectId: null,
        status: "PENDING",
        title: input.title,
        uploadedBy: context.session.user.id,
      });

      return { documentId, presignedUrl: uploadUrl };
    }),

  retry: adminProcedure
    .input(z.object({ id: z.string() }))
    .output(selectDocumentSchema)
    .handler(async ({ input }) => {
      const [doc] = await db
        .select()
        .from(document)
        .where(eq(document.id, input.id))
        .limit(1);

      if (!doc) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      if (doc.status === "FAILED") {
        const [updated] = await db
          .update(document)
          .set({ errorMessage: null, markdownContent: null, status: "PENDING" })
          .where(eq(document.id, input.id))
          .returning();

        if (!updated) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Failed to update document",
          });
        }

        await documentQueue.add("process", { documentId: doc.id });
        return updated;
      }

      if (doc.status === "INGEST_FAILED") {
        const [updated] = await db
          .update(document)
          .set({ errorMessage: null, status: "INGESTING" })
          .where(eq(document.id, input.id))
          .returning();

        if (!updated) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Failed to update document",
          });
        }

        await wikiIngestionQueue.add("ingest", { documentId: doc.id });
        return updated;
      }

      throw new ORPCError("BAD_REQUEST", {
        message: "Only FAILED or INGEST_FAILED documents can be retried",
      });
    }),

  update: adminProcedure
    .input(z.object({ id: z.string() }).merge(updateDocumentSchema))
    .output(selectDocumentSchema)
    .handler(async ({ input }) => {
      const { id, ...data } = input;

      if (data.categoryId) {
        const category = await db
          .select({ id: documentCategory.id })
          .from(documentCategory)
          .where(eq(documentCategory.id, data.categoryId))
          .limit(1);

        if (!category.length) {
          throw new ORPCError("NOT_FOUND", { message: "Category not found" });
        }
      }

      const [updated] = await db
        .update(document)
        .set(data)
        .where(eq(document.id, id))
        .returning();

      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      return updated;
    }),
};
