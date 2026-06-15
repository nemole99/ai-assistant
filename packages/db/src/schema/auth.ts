import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  date,
  index,
  integer,
  jsonb,
  unique,
  primaryKey,
  vector,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  id: text("id").primaryKey(),
  image: text("image"),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["ADMIN", "MANAGER", "EMPLOYEE"] })
    .default("EMPLOYEE")
    .notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    ipAddress: text("ip_address"),
    token: text("token").notNull().unique(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    accessToken: text("access_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    accountId: text("account_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    idToken: text("id_token"),
    password: text("password"),
    providerId: text("provider_id").notNull(),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    value: text("value").notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const userRelations = relations(user, ({ many, one }) => ({
  accounts: many(account),
  aiProviders: many(aiProvider),
  employee: one(employee, {
    fields: [user.id],
    references: [employee.userId],
  }),
  sessions: many(session),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// --- Organization ---

export const employeeStatusEnum = pgEnum("employee_status", [
  "ACTIVE",
  "INACTIVE",
]);

export const employeeLevelEnum = pgEnum("employee_level", ["JUNIOR", "SENIOR"]);

export const department = pgTable("department", {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  description: text("description"),
  id: text("id").primaryKey(),
  managerId: text("manager_id"), // FK to employee — circular ref resolved via relations
  name: text("name").notNull().unique(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const employee = pgTable(
  "employee",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    departmentId: text("department_id")
      .notNull()
      .references(() => department.id),
    email: text("email").notNull().unique(),
    employeeCode: text("employee_code").notNull().unique(),
    fullName: text("full_name").notNull(),
    id: text("id").primaryKey(),
    joinDate: date("join_date").notNull(),
    level: employeeLevelEnum("level"),
    phone: text("phone"),
    position: text("position").notNull(),
    status: employeeStatusEnum("status").default("ACTIVE").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userId: text("user_id")
      .unique()
      .references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [
    index("employee_departmentId_idx").on(table.departmentId),
    index("employee_userId_idx").on(table.userId),
  ]
);

export const departmentRelations = relations(department, ({ many, one }) => ({
  employees: many(employee),
  manager: one(employee, {
    fields: [department.managerId],
    references: [employee.id],
    relationName: "department_manager",
  }),
}));

export const employeeRelations = relations(employee, ({ one, many }) => ({
  department: one(department, {
    fields: [employee.departmentId],
    references: [department.id],
  }),
  managedDepartments: many(department, {
    relationName: "department_manager",
  }),
  managedProjects: many(project, { relationName: "project_manager" }),
  projectMemberships: many(projectMember),
  user: one(user, {
    fields: [employee.userId],
    references: [user.id],
  }),
}));

// --- AI Providers ---

export const aiProviderTypeEnum = pgEnum("ai_provider_type", [
  "github_copilot",
  "openai",
  "google",
  "anthropic",
]);

export const modelPurposeEnum = pgEnum("model_purpose", [
  "chat",
  "embedding",
  "vision",
]);

export const aiProvider = pgTable(
  "ai_provider",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    encryptedToken: text("encrypted_token").notNull(),
    id: text("id").primaryKey(),
    metadata: jsonb("metadata").$type<{
      username?: string;
      avatarUrl?: string;
    }>(),
    provider: aiProviderTypeEnum("provider").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("ai_provider_userId_provider_unique").on(
      table.userId,
      table.provider
    ),
    index("ai_provider_userId_idx").on(table.userId),
  ]
);

export const aiModelAssignment = pgTable(
  "ai_model_assignment",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    model: text("model").notNull(),
    providerId: text("provider_id").references(() => aiProvider.id, {
      onDelete: "cascade",
    }),
    purpose: modelPurposeEnum("purpose").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    unique("ai_model_assignment_userId_purpose_unique").on(
      table.userId,
      table.purpose
    ),
    index("ai_model_assignment_userId_idx").on(table.userId),
  ]
);

export const aiProviderRelations = relations(aiProvider, ({ one, many }) => ({
  modelAssignments: many(aiModelAssignment),
  user: one(user, {
    fields: [aiProvider.userId],
    references: [user.id],
  }),
}));

export const aiModelAssignmentRelations = relations(
  aiModelAssignment,
  ({ one }) => ({
    provider: one(aiProvider, {
      fields: [aiModelAssignment.providerId],
      references: [aiProvider.id],
    }),
    user: one(user, {
      fields: [aiModelAssignment.userId],
      references: [user.id],
    }),
  })
);

// --- Projects ---

export const projectStatusEnum = pgEnum("project_status", [
  "ACTIVE",
  "COMPLETED",
]);

export const project = pgTable("project", {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  description: text("description"),
  id: text("id").primaryKey(),
  managerId: text("manager_id").references(() => employee.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  status: projectStatusEnum("status").default("ACTIVE").notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const projectMember = pgTable(
  "project_member",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.employeeId] }),
    index("project_member_projectId_idx").on(table.projectId),
    index("project_member_employeeId_idx").on(table.employeeId),
  ]
);

export const projectRelations = relations(project, ({ one, many }) => ({
  manager: one(employee, {
    fields: [project.managerId],
    references: [employee.id],
    relationName: "project_manager",
  }),
  members: many(projectMember),
}));

export const projectMemberRelations = relations(projectMember, ({ one }) => ({
  employee: one(employee, {
    fields: [projectMember.employeeId],
    references: [employee.id],
  }),
  project: one(project, {
    fields: [projectMember.projectId],
    references: [project.id],
  }),
}));

// --- Documents ---

export const documentStatusEnum = pgEnum("document_status", [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "INGESTING",
  "INGESTED",
  "INGEST_FAILED",
]);

export const documentCategory = pgTable("document_category", {
  color: text("color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  description: text("description"),
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const document = pgTable(
  "document",
  {
    categoryId: text("category_id")
      .notNull()
      .references(() => documentCategory.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description"),
    errorMessage: text("error_message"),
    fileSize: integer("file_size").notNull(),
    id: text("id").primaryKey(),
    markdownContent: text("markdown_content"),
    mimeType: text("mime_type").notNull(),
    objectKey: text("object_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    status: documentStatusEnum("status").default("PENDING").notNull(),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    index("document_categoryId_idx").on(table.categoryId),
    index("document_projectId_idx").on(table.projectId),
    index("document_status_idx").on(table.status),
    index("document_uploadedBy_idx").on(table.uploadedBy),
  ]
);

export const documentCategoryRelations = relations(
  documentCategory,
  ({ many }) => ({
    documents: many(document),
  })
);

export const documentRelations = relations(document, ({ one, many }) => ({
  category: one(documentCategory, {
    fields: [document.categoryId],
    references: [documentCategory.id],
  }),
  project: one(project, {
    fields: [document.projectId],
    references: [project.id],
  }),
  uploader: one(user, {
    fields: [document.uploadedBy],
    references: [user.id],
  }),
  wikiPageSources: many(wikiPageSource),
}));

// --- Wiki ---

export const systemPurposeEnum = pgEnum("system_purpose", [
  "pipeline_text",
  "pipeline_embedding",
]);

export const WIKI_EMBEDDING_DIMENSIONS = 4096;

export const systemAiConfig = pgTable("system_ai_config", {
  apiKey: text("api_key").notNull(),
  baseUrl: text("base_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  id: text("id").primaryKey(),
  modelId: text("model_id").notNull(),
  providerType: text("provider_type").notNull(),
  purpose: systemPurposeEnum("purpose").notNull().unique(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const wikiPage = pgTable("wiki_page", {
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull().unique(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const wikiPageSource = pgTable(
  "wiki_page_source",
  {
    documentId: text("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    wikiPageId: text("wiki_page_id")
      .notNull()
      .references(() => wikiPage.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.wikiPageId, table.documentId] })]
);

export const wikiPageChunk = pgTable(
  "wiki_page_chunk",
  {
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", {
      dimensions: WIKI_EMBEDDING_DIMENSIONS,
    }),
    id: text("id").primaryKey(),
    wikiPageId: text("wiki_page_id")
      .notNull()
      .references(() => wikiPage.id, { onDelete: "cascade" }),
  },
  (table) => [index("wiki_page_chunk_wikiPageId_idx").on(table.wikiPageId)]
);

export const wikiPageRelations = relations(wikiPage, ({ many }) => ({
  chunks: many(wikiPageChunk),
  sources: many(wikiPageSource),
}));

export const wikiPageSourceRelations = relations(wikiPageSource, ({ one }) => ({
  document: one(document, {
    fields: [wikiPageSource.documentId],
    references: [document.id],
  }),
  wikiPage: one(wikiPage, {
    fields: [wikiPageSource.wikiPageId],
    references: [wikiPage.id],
  }),
}));

export const wikiPageChunkRelations = relations(wikiPageChunk, ({ one }) => ({
  wikiPage: one(wikiPage, {
    fields: [wikiPageChunk.wikiPageId],
    references: [wikiPage.id],
  }),
}));
