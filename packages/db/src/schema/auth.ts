import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  date,
  index,
  jsonb,
  unique,
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

export const employeeStatusEnum = pgEnum("employee_status", ["ACTIVE", "INACTIVE"]);

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
}));

// --- AI Providers ---

export const aiProviderTypeEnum = pgEnum("ai_provider_type", [
  "github_copilot",
  "openai",
  "google",
  "anthropic",
]);

export const modelPurposeEnum = pgEnum("model_purpose", ["chat", "embedding", "vision"]);

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
    unique("ai_provider_userId_provider_unique").on(table.userId, table.provider),
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
    providerId: text("provider_id")
      .notNull()
      .references(() => aiProvider.id, { onDelete: "cascade" }),
    purpose: modelPurposeEnum("purpose").notNull(),
    model: text("model").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("ai_model_assignment_userId_purpose_unique").on(table.userId, table.purpose),
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

export const aiModelAssignmentRelations = relations(aiModelAssignment, ({ one }) => ({
  user: one(user, {
    fields: [aiModelAssignment.userId],
    references: [user.id],
  }),
  provider: one(aiProvider, {
    fields: [aiModelAssignment.providerId],
    references: [aiProvider.id],
  }),
}));
