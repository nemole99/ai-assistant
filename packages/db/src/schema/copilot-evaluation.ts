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
    category: ticketCategoryEnum("category").notNull(),
    codeFixActual: real("code_fix_actual").notNull(),
    codeFixEstimate: real("code_fix_estimate").notNull(),
    codeReviewActual: real("code_review_actual").notNull(),
    codeReviewEstimate: real("code_review_estimate").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    developer: text("developer").notNull(),
    id: text("id").primaryKey(),
    investigateActual: real("investigate_actual").notNull(),
    investigateEstimate: real("investigate_estimate").notNull(),
    processDate: date("process_date").notNull(),
    project: text("project").notNull(),
    reopenStatus: integer("reopen_status").default(0).notNull(),
    ticketUrl: text("ticket_url").notNull().unique(),
    totalEffort: real("total_effort").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("copilot_ticket_developer_idx").on(table.developer),
    index("copilot_ticket_project_idx").on(table.project),
    index("copilot_ticket_processDate_idx").on(table.processDate),
  ]
);

// --- Timesheet ---

export const copilotTimesheetEntry = pgTable(
  "copilot_timesheet_entry",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    day: integer("day").notNull(), // 1-31
    employeeName: text("employee_name").notNull(),
    id: text("id").primaryKey(),
    month: text("month").notNull(), // YYYY-MM
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    value: text("value").notNull().default(""), // "x" = present, "" = absent,
  },
  (table) => [
    unique("copilot_timesheet_entry_unique").on(
      table.month,
      table.employeeName,
      table.day
    ),
    index("copilot_timesheet_month_idx").on(table.month),
    index("copilot_timesheet_employee_idx").on(table.employeeName),
  ]
);

export const copilotTimesheetHoliday = pgTable(
  "copilot_timesheet_holiday",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    day: integer("day").notNull(), // 1-31
    id: text("id").primaryKey(),
    month: text("month").notNull(), // YYYY-MM,
  },
  (table) => [
    unique("copilot_timesheet_holiday_unique").on(table.month, table.day),
    index("copilot_timesheet_holiday_month_idx").on(table.month),
  ]
);

// --- KPI Tables ---

export const copilotKpiProductivity = pgTable(
  "copilot_kpi_productivity",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    developer: text("developer").notNull(),
    id: text("id").primaryKey(),
    monthlyValues: jsonb("monthly_values")
      .$type<Record<string, number>>()
      .default({}),
    project: text("project").notNull(),
    result: real("result"), // ticket/day actual
    target: real("target"), // ticket/day target
    title: text("title"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("copilot_kpi_productivity_developer_idx").on(table.developer),
  ]
);

export const copilotKpiSharing = pgTable(
  "copilot_kpi_sharing",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    developer: text("developer").notNull(),
    id: text("id").primaryKey(),
    monthlyValues: jsonb("monthly_values")
      .$type<Record<string, number>>()
      .default({}),
    project: text("project").notNull(),
    result: real("result"), // hours actual
    target: real("target"), // hours/year target
    title: text("title"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("copilot_kpi_sharing_developer_idx").on(table.developer)]
);

export const copilotKpiQuality = pgTable(
  "copilot_kpi_quality",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    developer: text("developer").notNull(),
    id: text("id").primaryKey(),
    monthlyValues: jsonb("monthly_values")
      .$type<Record<string, number>>()
      .default({}),
    project: text("project").notNull(),
    reopenNumber: real("reopen_number"),
    reopenPercent: real("reopen_percent"),
    result: real("result"),
    title: text("title"),
    totalByMar: real("total_by_mar"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("copilot_kpi_quality_developer_idx").on(table.developer)]
);

export const copilotKpiSummary = pgTable(
  "copilot_kpi_summary",
  {
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    developer: text("developer").notNull(),
    id: text("id").primaryKey(),
    project: text("project").notNull(),
    resultProductivity: real("result_productivity"),
    resultReopen: real("result_reopen"),
    resultSharing: real("result_sharing"),
    targetProductivity: real("target_productivity"),
    targetReopen: real("target_reopen"),
    targetSharing: real("target_sharing"),
    title: text("title"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("copilot_kpi_summary_developer_idx").on(table.developer)]
);

// --- Audit Log ---

export const copilotAuditLog = pgTable(
  "copilot_audit_log",
  {
    action: auditActionEnum("action").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    developer: text("developer"),
    id: text("id").primaryKey(),
    performedBy: text("performed_by").references(() => employee.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("copilot_audit_log_action_idx").on(table.action),
    index("copilot_audit_log_createdAt_idx").on(table.createdAt),
  ]
);

// --- Relations ---

export const copilotTicketRelations = relations(copilotTicket, () => ({}));

export const copilotAuditLogRelations = relations(
  copilotAuditLog,
  ({ one }) => ({
    performer: one(employee, {
      fields: [copilotAuditLog.performedBy],
      references: [employee.id],
    }),
  })
);
