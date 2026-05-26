import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  date,
  index,
  pgEnum,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";
import { employee } from "./auth";

// --- Enums ---

export const ticketCategoryEnum = pgEnum("ticket_category", ["bug", "feature"]);

export const auditActionEnum = pgEnum("copilot_audit_action", [
  "CREATE_TICKET",
  "UPDATE_TICKET",
  "DELETE_TICKET",
  "IMPORT_TICKET",
]);

// --- Copilot Ticket ---

export const copilotTicket = pgTable(
  "copilot_ticket",
  {
    id: text("id").primaryKey(),
    developer: text("developer").notNull(),
    project: text("project").notNull(),
    category: ticketCategoryEnum("category").notNull(),
    ticketUrl: text("ticket_url").notNull().unique(),
    processDate: date("process_date").notNull(),
    totalEffort: real("total_effort").notNull(),
    investigateEstimate: real("investigate_estimate").notNull(),
    investigateActual: real("investigate_actual").notNull(),
    codeFixEstimate: real("code_fix_estimate").notNull(),
    codeFixActual: real("code_fix_actual").notNull(),
    codeReviewEstimate: real("code_review_estimate").notNull(),
    codeReviewActual: real("code_review_actual").notNull(),
    reopenStatus: integer("reopen_status").default(0).notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("copilot_ticket_developer_idx").on(table.developer),
    index("copilot_ticket_project_idx").on(table.project),
    index("copilot_ticket_processDate_idx").on(table.processDate),
  ],
);

// --- Timesheet ---

export const copilotTimesheetEntry = pgTable(
  "copilot_timesheet_entry",
  {
    id: text("id").primaryKey(),
    month: text("month").notNull(), // YYYY-MM
    employeeName: text("employee_name").notNull(),
    day: integer("day").notNull(), // 1-31
    value: text("value").notNull().default(""), // "x" = present, "" = absent
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("copilot_timesheet_entry_unique").on(table.month, table.employeeName, table.day),
    index("copilot_timesheet_month_idx").on(table.month),
    index("copilot_timesheet_employee_idx").on(table.employeeName),
  ],
);

export const copilotTimesheetHoliday = pgTable(
  "copilot_timesheet_holiday",
  {
    id: text("id").primaryKey(),
    month: text("month").notNull(), // YYYY-MM
    day: integer("day").notNull(), // 1-31
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("copilot_timesheet_holiday_unique").on(table.month, table.day),
    index("copilot_timesheet_holiday_month_idx").on(table.month),
  ],
);

// --- KPI Tables ---

export const copilotKpiProductivity = pgTable(
  "copilot_kpi_productivity",
  {
    id: text("id").primaryKey(),
    developer: text("developer").notNull(),
    project: text("project").notNull(),
    title: text("title"),
    target: real("target"), // ticket/day target
    result: real("result"), // ticket/day actual
    monthlyValues: jsonb("monthly_values").$type<Record<string, number>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("copilot_kpi_productivity_developer_idx").on(table.developer)],
);

export const copilotKpiSharing = pgTable(
  "copilot_kpi_sharing",
  {
    id: text("id").primaryKey(),
    developer: text("developer").notNull(),
    project: text("project").notNull(),
    title: text("title"),
    target: real("target"), // hours/year target
    result: real("result"), // hours actual
    monthlyValues: jsonb("monthly_values").$type<Record<string, number>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("copilot_kpi_sharing_developer_idx").on(table.developer)],
);

export const copilotKpiQuality = pgTable(
  "copilot_kpi_quality",
  {
    id: text("id").primaryKey(),
    developer: text("developer").notNull(),
    project: text("project").notNull(),
    title: text("title"),
    reopenPercent: real("reopen_percent"),
    totalByMar: real("total_by_mar"),
    reopenNumber: real("reopen_number"),
    result: real("result"),
    monthlyValues: jsonb("monthly_values").$type<Record<string, number>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("copilot_kpi_quality_developer_idx").on(table.developer)],
);

export const copilotKpiSummary = pgTable(
  "copilot_kpi_summary",
  {
    id: text("id").primaryKey(),
    developer: text("developer").notNull(),
    project: text("project").notNull(),
    title: text("title"),
    targetProductivity: real("target_productivity"),
    targetReopen: real("target_reopen"),
    targetSharing: real("target_sharing"),
    resultProductivity: real("result_productivity"),
    resultReopen: real("result_reopen"),
    resultSharing: real("result_sharing"),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("copilot_kpi_summary_developer_idx").on(table.developer)],
);

// --- Audit Log ---

export const copilotAuditLog = pgTable(
  "copilot_audit_log",
  {
    id: text("id").primaryKey(),
    action: auditActionEnum("action").notNull(),
    developer: text("developer"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    performedBy: text("performed_by").references(() => employee.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("copilot_audit_log_action_idx").on(table.action),
    index("copilot_audit_log_createdAt_idx").on(table.createdAt),
  ],
);

// --- Relations ---

export const copilotTicketRelations = relations(copilotTicket, ({}) => ({}));

export const copilotAuditLogRelations = relations(copilotAuditLog, ({ one }) => ({
  performer: one(employee, {
    fields: [copilotAuditLog.performedBy],
    references: [employee.id],
  }),
}));
