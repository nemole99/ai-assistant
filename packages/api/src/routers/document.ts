import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { document, documentCategory } from "@workspace/db/schema/auth";
import {
  selectDocumentCategorySchema,
  selectDocumentSchema,
  updateDocumentSchema,
} from "@workspace/db/schema/validation";
import { documentQueue } from "@workspace/queue";
import {
  deleteObject,
  documentObjectKey,
  objectExists,
  presignedGetUrl,
  presignedPutUrl,
} from "@workspace/storage";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, protectedProcedure } from "..";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const selectDocumentWithCategorySchema = selectDocumentSchema.extend({
  category: selectDocumentCategorySchema,
});

export const documentRouter = {
  list: protectedProcedure
    .input(
      z
        .object({
          categoryId: z.string().optional(),
          query: z.string().optional(),
        })
        .optional(),
    )
    .output(z.array(selectDocumentWithCategorySchema))
    .handler(async ({ input, context }) => {
      const isAdmin = context.session.user.role === "ADMIN";

      const rows = await db
        .select({
          id: document.id,
          title: document.title,
          description: document.description,
          categoryId: document.categoryId,
          projectId: document.projectId,
          status: document.status,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          objectKey: document.objectKey,
          originalFilename: document.originalFilename,
          markdownContent: document.markdownContent,
          errorMessage: document.errorMessage,
          uploadedBy: document.uploadedBy,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          category: {
            id: documentCategory.id,
            name: documentCategory.name,
            color: documentCategory.color,
            description: documentCategory.description,
            createdAt: documentCategory.createdAt,
            updatedAt: documentCategory.updatedAt,
          },
        })
        .from(document)
        .innerJoin(documentCategory, eq(document.categoryId, documentCategory.id))
        .where(
          and(
            isNull(document.projectId),
            isAdmin ? undefined : eq(document.status, "COMPLETED"),
            input?.categoryId ? eq(document.categoryId, input.categoryId) : undefined,
            input?.query ? ilike(document.title, `%${input.query}%`) : undefined,
          ),
        )
        .orderBy(document.createdAt);

      return rows;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(selectDocumentWithCategorySchema)
    .handler(async ({ input, context }) => {
      const isAdmin = context.session.user.role === "ADMIN";

      const [row] = await db
        .select({
          id: document.id,
          title: document.title,
          description: document.description,
          categoryId: document.categoryId,
          projectId: document.projectId,
          status: document.status,
          mimeType: document.mimeType,
          fileSize: document.fileSize,
          objectKey: document.objectKey,
          originalFilename: document.originalFilename,
          markdownContent: document.markdownContent,
          errorMessage: document.errorMessage,
          uploadedBy: document.uploadedBy,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
          category: {
            id: documentCategory.id,
            name: documentCategory.name,
            color: documentCategory.color,
            description: documentCategory.description,
            createdAt: documentCategory.createdAt,
            updatedAt: documentCategory.updatedAt,
          },
        })
        .from(document)
        .innerJoin(documentCategory, eq(document.categoryId, documentCategory.id))
        .where(eq(document.id, input.id))
        .limit(1);

      if (!row) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      if (!isAdmin && row.status !== "COMPLETED") {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      return row;
    }),

  requestUpload: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        categoryId: z.string(),
        filename: z.string().min(1),
        fileSize: z.number().int().positive().max(MAX_FILE_SIZE, {
          message: "File size must be 10 MB or less",
        }),
        mimeType: z.literal("application/pdf", {
          message: "Only PDF files are supported",
        }),
      }),
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
        id: documentId,
        title: input.title,
        description: input.description ?? null,
        categoryId: input.categoryId,
        projectId: null,
        status: "PENDING",
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        objectKey,
        originalFilename: input.filename,
        uploadedBy: context.session.user.id,
      });

      return { documentId, presignedUrl: uploadUrl };
    }),

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

      const [updated] = await db.update(document).set(data).where(eq(document.id, id)).returning();

      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      return updated;
    }),

  delete: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
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

  retry: adminProcedure
    .input(z.object({ id: z.string() }))
    .output(selectDocumentSchema)
    .handler(async ({ input }) => {
      const [doc] = await db.select().from(document).where(eq(document.id, input.id)).limit(1);

      if (!doc) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      if (doc.status !== "FAILED") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Only FAILED documents can be retried",
        });
      }

      const [updated] = await db
        .update(document)
        .set({ status: "PENDING", errorMessage: null, markdownContent: null })
        .where(eq(document.id, input.id))
        .returning();

      if (!updated) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to update document",
        });
      }

      await documentQueue.add("process", { documentId: doc.id });

      return updated;
    }),

  getDownloadUrl: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ url: z.string() }))
    .handler(async ({ input, context }) => {
      const isAdmin = context.session.user.role === "ADMIN";

      const [doc] = await db
        .select({ status: document.status, objectKey: document.objectKey })
        .from(document)
        .where(eq(document.id, input.id))
        .limit(1);

      if (!doc) {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      if (!isAdmin && doc.status !== "COMPLETED") {
        throw new ORPCError("NOT_FOUND", { message: "Document not found" });
      }

      const url = await presignedGetUrl(doc.objectKey, 300);

      return { url };
    }),
};
