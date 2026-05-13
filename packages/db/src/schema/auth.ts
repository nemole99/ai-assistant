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
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role", { enum: ["ADMIN", "MANAGER", "EMPLOYEE"] })
    .default("EMPLOYEE")
    .notNull(),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  employee: one(employee, {
    fields: [user.id],
    references: [employee.userId],
  }),
  aiProviders: many(aiProvider),
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

export const department = pgTable("department", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  managerId: text("manager_id"), // FK to employee — circular ref resolved via relations
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const employee = pgTable(
  "employee",
  {
    id: text("id").primaryKey(),
    employeeCode: text("employee_code").notNull().unique(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    position: text("position").notNull(),
    departmentId: text("department_id")
      .notNull()
      .references(() => department.id),
    userId: text("user_id")
      .unique()
      .references(() => user.id, { onDelete: "set null" }),
    joinDate: date("join_date").notNull(),
    status: employeeStatusEnum("status").default("ACTIVE").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("employee_departmentId_idx").on(table.departmentId),
    index("employee_userId_idx").on(table.userId),
  ],
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
  user: one(user, {
    fields: [employee.userId],
    references: [user.id],
  }),
  managedDepartments: many(department, {
    relationName: "department_manager",
  }),
  projectMemberships: many(projectMember),
  managedProjects: many(project, { relationName: "project_manager" }),
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
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: aiProviderTypeEnum("provider").notNull(),
    encryptedToken: text("encrypted_token").notNull(),
    metadata: jsonb("metadata").$type<{
      username?: string;
      avatarUrl?: string;
    }>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("ai_provider_userId_provider_unique").on(
      table.userId,
      table.provider,
    ),
    index("ai_provider_userId_idx").on(table.userId),
  ],
);

export const aiModelAssignment = pgTable(
  "ai_model_assignment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerId: text("provider_id").references(() => aiProvider.id, {
      onDelete: "cascade",
    }),
    purpose: modelPurposeEnum("purpose").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("ai_model_assignment_userId_purpose_unique").on(
      table.userId,
      table.purpose,
    ),
    index("ai_model_assignment_userId_idx").on(table.userId),
  ],
);

export const aiProviderRelations = relations(aiProvider, ({ one, many }) => ({
  user: one(user, {
    fields: [aiProvider.userId],
    references: [user.id],
  }),
  modelAssignments: many(aiModelAssignment),
}));

export const aiModelAssignmentRelations = relations(
  aiModelAssignment,
  ({ one }) => ({
    user: one(user, {
      fields: [aiModelAssignment.userId],
      references: [user.id],
    }),
    provider: one(aiProvider, {
      fields: [aiModelAssignment.providerId],
      references: [aiProvider.id],
    }),
  }),
);

// --- Projects ---

export const projectStatusEnum = pgEnum("project_status", [
  "ACTIVE",
  "COMPLETED",
]);

export const project = pgTable("project", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").default("ACTIVE").notNull(),
  managerId: text("manager_id").references(() => employee.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const projectMember = pgTable(
  "project_member",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.employeeId] }),
    index("project_member_projectId_idx").on(table.projectId),
    index("project_member_employeeId_idx").on(table.employeeId),
  ],
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
  project: one(project, {
    fields: [projectMember.projectId],
    references: [project.id],
  }),
  employee: one(employee, {
    fields: [projectMember.employeeId],
    references: [employee.id],
  }),
}));

// --- Documents ---

export const documentStatusEnum = pgEnum("document_status", [
  "PENDING",
  "COMPLETED",
  "FAILED",
]);

export const documentCategory = pgTable("document_category", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const document = pgTable(
  "document",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    categoryId: text("category_id")
      .notNull()
      .references(() => documentCategory.id),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    status: documentStatusEnum("status").default("PENDING").notNull(),
    mimeType: text("mime_type").notNull(),
    fileSize: integer("file_size").notNull(),
    objectKey: text("object_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    markdownContent: text("markdown_content"),
    errorMessage: text("error_message"),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("document_categoryId_idx").on(table.categoryId),
    index("document_projectId_idx").on(table.projectId),
    index("document_status_idx").on(table.status),
    index("document_uploadedBy_idx").on(table.uploadedBy),
  ],
);

export const documentCategoryRelations = relations(
  documentCategory,
  ({ many }) => ({
    documents: many(document),
  }),
);

export const documentRelations = relations(document, ({ one }) => ({
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
}));
