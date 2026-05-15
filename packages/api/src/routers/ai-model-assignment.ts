import { db } from "@workspace/db";
import { aiModelAssignment, aiProvider } from "@workspace/db/schema/auth";
import { ORPCError } from "@orpc/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const purposeSchema = z.enum(["chat", "embedding", "vision"]);

export const get = protectedProcedure
  .input(z.object({ purpose: purposeSchema }))
  .output(
    z
      .object({
        model: z.string(),
        providerId: z.string().nullable(),
      })
      .nullable(),
  )
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    const rows = await db
      .select({
        model: aiModelAssignment.model,
        providerId: aiModelAssignment.providerId,
      })
      .from(aiModelAssignment)
      .where(
        and(eq(aiModelAssignment.userId, userId), eq(aiModelAssignment.purpose, input.purpose)),
      )
      .limit(1);

    if (!rows[0]) return null;
    return rows[0];
  });

export const set = protectedProcedure
  .input(
    z.object({
      purpose: purposeSchema,
      model: z.string().min(1),
      providerId: z.string().min(1).nullable(),
    }),
  )
  .handler(async ({ input, context }) => {
    const userId = context.session.user.id;

    // Verify the provider belongs to this user if it's not a system provider
    if (input.providerId) {
      const providerRows = await db
        .select({ id: aiProvider.id })
        .from(aiProvider)
        .where(and(eq(aiProvider.id, input.providerId), eq(aiProvider.userId, userId)))
        .limit(1);

      if (!providerRows[0]) {
        throw new ORPCError("FORBIDDEN", {
          message: "Provider not found or does not belong to current user",
        });
      }
    }

    const now = new Date();
    await db
      .insert(aiModelAssignment)
      .values({
        id: crypto.randomUUID(),
        userId,
        providerId: input.providerId,
        purpose: input.purpose,
        model: input.model,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [aiModelAssignment.userId, aiModelAssignment.purpose],
        set: {
          model: input.model,
          providerId: input.providerId,
          updatedAt: now,
        },
      });

    return { success: true };
  });

export const aiModelAssignmentRouter = { get, set };
