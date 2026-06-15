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

import { employee, project } from "./auth";

// --- Enums ---

export const evaluationTicketCategoryEnum = pgEnum(
  "evaluation_ticket_category",
  ["bug", "feature"]
);

export const evaluationAuditActionEnum = pgEnum("evaluation_audit_action", [
  "CREATE_TICKET",
  "UPDATE_TICKET",
  "DELETE_TICKET",
  "IMPORT_TICKET",
  "UPDATE_TIMESHEET",
  "SET_HOLIDAYS",
  "CREATE_KPI",
  "UPDATE_KPI",
]);

// --- Effort Ticket ---

export const evaluationTicket = pgTable(
  "evaluation_ticket",
  {
    category: evaluationTicketCategoryEnum("category").notNull(),
    codeFixActual: real("code_fix_actual").notNull(),
    codeFixEstimate: real("code_fix_estimate").notNull(),
    codeReviewActual: real("code_review_actual").notNull(),
    codeReviewEstimate: real("code_review_estimate").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "restrict" }),
    id: text("id").primaryKey(),
    investigateActual: real("investigate_actual").notNull(),
    investigateEstimate: real("investigate_estimate").notNull(),
    processDate: date("process_date").notNull(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "restrict" }),
    reopenStatus: integer("reopen_status").default(0).notNull(),
    ticketUrl: text("ticket_url").notNull(),
    // Planned total effort in hours; null when not declared (not derivable from phases)
    totalEffort: real("total_effort"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("evaluation_ticket_ticket_url_unique").on(table.ticketUrl),
    index("evaluation_ticket_employeeId_idx").on(table.employeeId),
    index("evaluation_ticket_projectId_idx").on(table.projectId),
    index("evaluation_ticket_processDate_idx").on(table.processDate),
  ]
);

// --- Timesheet ---

export const evaluationTimesheetEntry = pgTable(
  "evaluation_timesheet_entry",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    day: integer("day").notNull(), // 1-31
    employeeId: text("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "restrict" }),
    id: text("id").primaryKey(),
    month: text("month").notNull(), // YYYY-MM
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    // Raw marker: "x" = full day, "x/2" = half day, "-" = approved leave, "" = absent
    value: text("value").notNull().default(""),
  },
  (table) => [
    unique("evaluation_timesheet_entry_unique").on(
      table.month,
      table.employeeId,
      table.day
    ),
    index("evaluation_timesheet_month_idx").on(table.month),
    index("evaluation_timesheet_employeeId_idx").on(table.employeeId),
  ]
);

export const evaluationTimesheetHoliday = pgTable(
  "evaluation_timesheet_holiday",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    day: integer("day").notNull(), // 1-31
    id: text("id").primaryKey(),
    month: text("month").notNull(), // YYYY-MM
  },
  (table) => [
    unique("evaluation_timesheet_holiday_unique").on(table.month, table.day),
    index("evaluation_timesheet_holiday_month_idx").on(table.month),
  ]
);

// --- KPI Tables ---
// title = seniority level snapshot ("Junior"/"Senior") copied from employee.level
// at row creation time — intentionally not a reference, promotions must not
// rewrite KPI history.
// monthlyValues keys are YYYY-MM.

export const evaluationKpiProductivity = pgTable(
  "evaluation_kpi_productivity",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "restrict" }),
    id: text("id").primaryKey(),
    monthlyValues: jsonb("monthly_values")
      .$type<Record<string, number>>()
      .default({}),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "restrict" }),
    result: real("result"), // ticket/day actual
    target: real("target"), // ticket/day target
    title: text("title"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("evaluation_kpi_productivity_unique").on(
      table.employeeId,
      table.projectId
    ),
    index("evaluation_kpi_productivity_employeeId_idx").on(table.employeeId),
  ]
);

export const evaluationKpiSharing = pgTable(
  "evaluation_kpi_sharing",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "restrict" }),
    id: text("id").primaryKey(),
    monthlyValues: jsonb("monthly_values")
      .$type<Record<string, number>>()
      .default({}),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "restrict" }),
    result: real("result"), // hours actual
    target: real("target"), // hours/year target
    title: text("title"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("evaluation_kpi_sharing_unique").on(
      table.employeeId,
      table.projectId
    ),
    index("evaluation_kpi_sharing_employeeId_idx").on(table.employeeId),
  ]
);

export const evaluationKpiQuality = pgTable(
  "evaluation_kpi_quality",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "restrict" }),
    id: text("id").primaryKey(),
    monthlyValues: jsonb("monthly_values")
      .$type<Record<string, number>>()
      .default({}),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "restrict" }),
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
  (table) => [
    unique("evaluation_kpi_quality_unique").on(
      table.employeeId,
      table.projectId
    ),
    index("evaluation_kpi_quality_employeeId_idx").on(table.employeeId),
  ]
);

export const evaluationKpiSummary = pgTable(
  "evaluation_kpi_summary",
  {
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employee.id, { onDelete: "restrict" }),
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "restrict" }),
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
  (table) => [
    unique("evaluation_kpi_summary_unique").on(
      table.employeeId,
      table.projectId
    ),
    index("evaluation_kpi_summary_employeeId_idx").on(table.employeeId),
  ]
);

// --- Audit Log ---

export const evaluationAuditLog = pgTable(
  "evaluation_audit_log",
  {
    action: evaluationAuditActionEnum("action").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    // Employee the mutated record belongs to (evaluated developer)
    employeeId: text("employee_id").references(() => employee.id, {
      onDelete: "set null",
    }),
    id: text("id").primaryKey(),
    // Employee of the logged-in User who performed the action; null when the
    // User has no Employee record (e.g. Admin)
    performedBy: text("performed_by").references(() => employee.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("evaluation_audit_log_action_idx").on(table.action),
    index("evaluation_audit_log_createdAt_idx").on(table.createdAt),
  ]
);

// --- Relations ---

export const evaluationTicketRelations = relations(
  evaluationTicket,
  ({ one }) => ({
    employee: one(employee, {
      fields: [evaluationTicket.employeeId],
      references: [employee.id],
    }),
    project: one(project, {
      fields: [evaluationTicket.projectId],
      references: [project.id],
    }),
  })
);

export const evaluationTimesheetEntryRelations = relations(
  evaluationTimesheetEntry,
  ({ one }) => ({
    employee: one(employee, {
      fields: [evaluationTimesheetEntry.employeeId],
      references: [employee.id],
    }),
  })
);

export const evaluationKpiProductivityRelations = relations(
  evaluationKpiProductivity,
  ({ one }) => ({
    employee: one(employee, {
      fields: [evaluationKpiProductivity.employeeId],
      references: [employee.id],
    }),
    project: one(project, {
      fields: [evaluationKpiProductivity.projectId],
      references: [project.id],
    }),
  })
);

export const evaluationKpiSharingRelations = relations(
  evaluationKpiSharing,
  ({ one }) => ({
    employee: one(employee, {
      fields: [evaluationKpiSharing.employeeId],
      references: [employee.id],
    }),
    project: one(project, {
      fields: [evaluationKpiSharing.projectId],
      references: [project.id],
    }),
  })
);

export const evaluationKpiQualityRelations = relations(
  evaluationKpiQuality,
  ({ one }) => ({
    employee: one(employee, {
      fields: [evaluationKpiQuality.employeeId],
      references: [employee.id],
    }),
    project: one(project, {
      fields: [evaluationKpiQuality.projectId],
      references: [project.id],
    }),
  })
);

export const evaluationKpiSummaryRelations = relations(
  evaluationKpiSummary,
  ({ one }) => ({
    employee: one(employee, {
      fields: [evaluationKpiSummary.employeeId],
      references: [employee.id],
    }),
    project: one(project, {
      fields: [evaluationKpiSummary.projectId],
      references: [project.id],
    }),
  })
);

export const evaluationAuditLogRelations = relations(
  evaluationAuditLog,
  ({ one }) => ({
    performer: one(employee, {
      fields: [evaluationAuditLog.performedBy],
      references: [employee.id],
      relationName: "evaluation_audit_performer",
    }),
    subject: one(employee, {
      fields: [evaluationAuditLog.employeeId],
      references: [employee.id],
      relationName: "evaluation_audit_subject",
    }),
  })
);
