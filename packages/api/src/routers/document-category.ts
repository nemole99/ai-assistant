import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { document, documentCategory } from "@workspace/db/schema/auth";
import {
  insertDocumentCategorySchema,
  selectDocumentCategorySchema,
  updateDocumentCategorySchema,
} from "@workspace/db/schema/validation";
import { count, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, protectedProcedure } from "..";

const selectWithCountSchema = selectDocumentCategorySchema.extend({
  documentCount: z.number(),
});

export const documentCategoryRouter = {
  list: protectedProcedure.output(z.array(selectWithCountSchema)).handler(async () => {
    const rows = await db
      .select({
        id: documentCategory.id,
        name: documentCategory.name,
        color: documentCategory.color,
        description: documentCategory.description,
        createdAt: documentCategory.createdAt,
        updatedAt: documentCategory.updatedAt,
        documentCount: count(document.id),
      })
      .from(documentCategory)
      .leftJoin(document, eq(document.categoryId, documentCategory.id))
      .groupBy(documentCategory.id)
      .orderBy(documentCategory.name);

    return rows;
  }),

  create: adminProcedure
    .input(insertDocumentCategorySchema)
    .output(selectDocumentCategorySchema)
    .handler(async ({ input }) => {
      const existing = await db
        .select({ id: documentCategory.id })
        .from(documentCategory)
        .where(eq(documentCategory.name, input.name))
        .limit(1);

      if (existing.length > 0) {
        throw new ORPCError("CONFLICT", {
          message: `Category "${input.name}" already exists`,
        });
      }

      const id = crypto.randomUUID();
      const [created] = await db
        .insert(documentCategory)
        .values({ id, ...input })
        .returning();

      if (!created) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to create category",
        });
      }

      return created;
    }),

  update: adminProcedure
    .input(z.object({ id: z.string() }).merge(updateDocumentCategorySchema.required().partial()))
    .output(selectDocumentCategorySchema)
    .handler(async ({ input }) => {
      const { id, ...data } = input;

      if (data.name) {
        const conflict = await db
          .select({ id: documentCategory.id })
          .from(documentCategory)
          .where(eq(documentCategory.name, data.name))
          .limit(1);

        if (conflict.length > 0 && conflict[0]!.id !== id) {
          throw new ORPCError("CONFLICT", {
            message: `Category "${data.name}" already exists`,
          });
        }
      }

      const [updated] = await db
        .update(documentCategory)
        .set(data)
        .where(eq(documentCategory.id, id))
        .returning();

      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Category not found" });
      }

      return updated;
    }),

  delete: adminProcedure.input(z.object({ id: z.string() })).handler(async ({ input }) => {
    const [docCount] = await db
      .select({ count: count(document.id) })
      .from(document)
      .where(eq(document.categoryId, input.id));

    if (docCount && docCount.count > 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: `Cannot delete category — it has ${docCount.count} document(s). Move or delete them first.`,
      });
    }

    await db.delete(documentCategory).where(eq(documentCategory.id, input.id));

    return { success: true };
  }),
};
