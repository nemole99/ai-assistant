import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const issueTypeEnum = pgEnum("issue_type", ["bug", "feature", "other"]);
export const issuePriorityEnum = pgEnum("issue_priority", [
  "low",
  "medium",
  "high",
]);
export const issueStatusEnum = pgEnum("issue_status", [
  "open",
  "in_progress",
  "resolved",
]);

export const issue = pgTable(
  "issue",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description").notNull(),
    id: text("id").primaryKey(),
    priority: issuePriorityEnum("priority").default("medium").notNull(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: issueStatusEnum("status").default("open").notNull(),
    title: text("title").notNull(),
    type: issueTypeEnum("type").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("issue_status_idx").on(table.status),
    index("issue_reporterId_idx").on(table.reporterId),
    index("issue_createdAt_idx").on(table.createdAt),
  ]
);

export const issueUpvote = pgTable(
  "issue_upvote",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issue.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("issue_upvote_unique").on(table.issueId, table.userId),
    index("issue_upvote_issueId_idx").on(table.issueId),
  ]
);

export const issueComment = pgTable(
  "issue_comment",
  {
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issue.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("issue_comment_issueId_idx").on(table.issueId)]
);

// --- Relations ---

export const issueRelations = relations(issue, ({ one, many }) => ({
  comments: many(issueComment),
  reporter: one(user, {
    fields: [issue.reporterId],
    references: [user.id],
  }),
  upvotes: many(issueUpvote),
}));

export const issueUpvoteRelations = relations(issueUpvote, ({ one }) => ({
  issue: one(issue, {
    fields: [issueUpvote.issueId],
    references: [issue.id],
  }),
  user: one(user, {
    fields: [issueUpvote.userId],
    references: [user.id],
  }),
}));

export const issueCommentRelations = relations(issueComment, ({ one }) => ({
  author: one(user, {
    fields: [issueComment.authorId],
    references: [user.id],
  }),
  issue: one(issue, {
    fields: [issueComment.issueId],
    references: [issue.id],
  }),
}));
