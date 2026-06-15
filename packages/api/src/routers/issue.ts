import { ORPCError } from "@orpc/server";
import { db } from "@workspace/db";
import { user } from "@workspace/db/schema/auth";
import { issue, issueComment, issueUpvote } from "@workspace/db/schema/issue";
import { insertIssueSchema } from "@workspace/db/schema/validation";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, managerProcedure, protectedProcedure } from "../index";

const issueListItemSchema = z.object({
  commentCount: z.number(),
  createdAt: z.string(),
  description: z.string(),
  id: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  reporterId: z.string(),
  reporterName: z.string(),
  status: z.enum(["open", "in_progress", "resolved"]),
  title: z.string(),
  type: z.enum(["bug", "feature", "other"]),
  updatedAt: z.string(),
  upvoteCount: z.number(),
  upvotedByMe: z.boolean(),
});

const issueCommentSchema = z.object({
  authorId: z.string(),
  authorName: z.string(),
  content: z.string(),
  createdAt: z.string(),
  id: z.string(),
});

const issueDetailSchema = issueListItemSchema.extend({
  comments: z.array(issueCommentSchema),
});

export const issueRouter = {
  addComment: managerProcedure
    .input(z.object({ content: z.string().min(1), issueId: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input, context }) => {
      const authorId = context.session.user.id;
      const [exists] = await db
        .select({ id: issue.id })
        .from(issue)
        .where(eq(issue.id, input.issueId));
      if (!exists) {
        throw new ORPCError("NOT_FOUND");
      }

      await db.insert(issueComment).values({
        authorId,
        content: input.content,
        id: crypto.randomUUID(),
        issueId: input.issueId,
      });
      return { success: true };
    }),

  create: protectedProcedure
    .input(insertIssueSchema)
    .output(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const reporterId = context.session.user.id;
      const id = crypto.randomUUID();
      await db.insert(issue).values({ id, reporterId, ...input });
      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input, context }) => {
      const { id: userId, role } = context.session.user;
      const [row] = await db
        .select({ reporterId: issue.reporterId })
        .from(issue)
        .where(eq(issue.id, input.id));
      if (!row) {
        throw new ORPCError("NOT_FOUND");
      }
      if (role !== "ADMIN" && row.reporterId !== userId) {
        throw new ORPCError("FORBIDDEN");
      }
      await db.delete(issue).where(eq(issue.id, input.id));
      return { success: true };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(issueDetailSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const [row] = await db
        .select({
          commentCount: sql<number>`(SELECT count(*)::int FROM issue_comment WHERE issue_id = ${issue.id})`,
          createdAt: sql<string>`${issue.createdAt}::text`,
          description: issue.description,
          id: issue.id,
          priority: issue.priority,
          reporterId: issue.reporterId,
          reporterName: user.name,
          status: issue.status,
          title: issue.title,
          type: issue.type,
          updatedAt: sql<string>`${issue.updatedAt}::text`,
          upvoteCount: sql<number>`(SELECT count(*)::int FROM issue_upvote WHERE issue_id = ${issue.id})`,
          upvotedByMe: sql<boolean>`EXISTS(SELECT 1 FROM issue_upvote WHERE issue_id = ${issue.id} AND user_id = ${userId})`,
        })
        .from(issue)
        .innerJoin(user, eq(user.id, issue.reporterId))
        .where(eq(issue.id, input.id));

      if (!row) {
        throw new ORPCError("NOT_FOUND");
      }

      const comments = await db
        .select({
          authorId: issueComment.authorId,
          authorName: user.name,
          content: issueComment.content,
          createdAt: sql<string>`${issueComment.createdAt}::text`,
          id: issueComment.id,
        })
        .from(issueComment)
        .innerJoin(user, eq(user.id, issueComment.authorId))
        .where(eq(issueComment.issueId, input.id))
        .orderBy(asc(issueComment.createdAt));

      return { ...row, comments };
    }),

  list: protectedProcedure
    .output(z.array(issueListItemSchema))
    .handler(async ({ context }) => {
      const userId = context.session.user.id;

      return db
        .select({
          commentCount: sql<number>`(SELECT count(*)::int FROM issue_comment WHERE issue_id = ${issue.id})`,
          createdAt: sql<string>`${issue.createdAt}::text`,
          description: issue.description,
          id: issue.id,
          priority: issue.priority,
          reporterId: issue.reporterId,
          reporterName: user.name,
          status: issue.status,
          title: issue.title,
          type: issue.type,
          updatedAt: sql<string>`${issue.updatedAt}::text`,
          upvoteCount: sql<number>`(SELECT count(*)::int FROM issue_upvote WHERE issue_id = ${issue.id})`,
          upvotedByMe: sql<boolean>`EXISTS(SELECT 1 FROM issue_upvote WHERE issue_id = ${issue.id} AND user_id = ${userId})`,
        })
        .from(issue)
        .innerJoin(user, eq(user.id, issue.reporterId))
        .orderBy(
          sql`CASE ${issue.status} WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'resolved' THEN 2 END`,
          desc(issue.createdAt)
        );
    }),

  toggleUpvote: protectedProcedure
    .input(z.object({ issueId: z.string() }))
    .output(z.object({ upvoted: z.boolean() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const [existing] = await db
        .select({ id: issueUpvote.id })
        .from(issueUpvote)
        .where(
          and(
            eq(issueUpvote.issueId, input.issueId),
            eq(issueUpvote.userId, userId)
          )
        );

      if (existing) {
        await db.delete(issueUpvote).where(eq(issueUpvote.id, existing.id));
        return { upvoted: false };
      }

      await db.insert(issueUpvote).values({
        id: crypto.randomUUID(),
        issueId: input.issueId,
        userId,
      });
      return { upvoted: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        description: z.string().min(1).optional(),
        id: z.string(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        title: z.string().min(1).optional(),
        type: z.enum(["bug", "feature", "other"]).optional(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input, context }) => {
      const { id: userId, role } = context.session.user;
      const { id, ...data } = input;
      const [row] = await db
        .select({ reporterId: issue.reporterId })
        .from(issue)
        .where(eq(issue.id, id));
      if (!row) {
        throw new ORPCError("NOT_FOUND");
      }
      if (role !== "ADMIN" && row.reporterId !== userId) {
        throw new ORPCError("FORBIDDEN");
      }
      await db.update(issue).set(data).where(eq(issue.id, id));
      return { success: true };
    }),

  updateStatus: managerProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["open", "in_progress", "resolved"]),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(issue)
        .set({ status: input.status })
        .where(eq(issue.id, input.id))
        .returning({ id: issue.id });
      if (!updated) {
        throw new ORPCError("NOT_FOUND");
      }
      return { success: true };
    }),
};
