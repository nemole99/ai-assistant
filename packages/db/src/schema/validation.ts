import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import {
  department,
  document,
  documentCategory,
  employee,
  project,
  projectMember,
  systemAiConfig,
  user,
  wikiPage,
  wikiPageChunk,
  wikiPageSource,
} from "./auth";
import {
  evaluationTicket,
  evaluationTimesheetEntry,
  evaluationTimesheetHoliday,
  evaluationKpiProductivity,
  evaluationKpiSharing,
  evaluationKpiQuality,
  evaluationKpiSummary,
  evaluationAuditLog,
} from "./evaluation";

// --- User ---

export const selectUserSchema = createSelectSchema(user);
export const insertUserSchema = createInsertSchema(user);

// --- Department ---

export const selectDepartmentSchema = createSelectSchema(department);
export const insertDepartmentSchema = createInsertSchema(department).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
export const updateDepartmentSchema = insertDepartmentSchema.partial();

// --- Employee ---

export const selectEmployeeSchema = createSelectSchema(employee);
export const insertEmployeeSchema = createInsertSchema(employee)
  .omit({
    createdAt: true,
    id: true,
    status: true,
    updatedAt: true,
    userId: true,
  })
  .extend({
    employeeCode: createInsertSchema(employee).shape.employeeCode.optional(),
    joinDate: createInsertSchema(employee).shape.joinDate.optional(),
  });
export const updateEmployeeSchema = insertEmployeeSchema
  .omit({ employeeCode: true })
  .partial()
  .extend({
    status: selectEmployeeSchema.shape.status.optional(),
  });

// --- Project ---

export const selectProjectSchema = createSelectSchema(project);
export const insertProjectSchema = createInsertSchema(project).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
export const updateProjectSchema = insertProjectSchema.partial();

export const selectProjectMemberSchema = createSelectSchema(projectMember);

// --- DocumentCategory ---

export const selectDocumentCategorySchema =
  createSelectSchema(documentCategory);
export const insertDocumentCategorySchema = createInsertSchema(
  documentCategory
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
export const updateDocumentCategorySchema =
  insertDocumentCategorySchema.partial();

// --- Document ---

export const selectDocumentSchema = createSelectSchema(document);
export const insertDocumentSchema = createInsertSchema(document).omit({
  createdAt: true,
  errorMessage: true,
  id: true,
  markdownContent: true,
  status: true,
  updatedAt: true,
});
export const updateDocumentSchema = insertDocumentSchema
  .pick({ categoryId: true, description: true, title: true })
  .partial();

// --- Evaluation Ticket ---

export const selectEvaluationTicketSchema =
  createSelectSchema(evaluationTicket);
export const insertEvaluationTicketSchema = createInsertSchema(
  evaluationTicket
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
export const updateEvaluationTicketSchema =
  insertEvaluationTicketSchema.partial();

// --- Evaluation Timesheet ---

export const selectEvaluationTimesheetEntrySchema = createSelectSchema(
  evaluationTimesheetEntry
);
export const insertEvaluationTimesheetEntrySchema = createInsertSchema(
  evaluationTimesheetEntry
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export const selectEvaluationTimesheetHolidaySchema = createSelectSchema(
  evaluationTimesheetHoliday
);
export const insertEvaluationTimesheetHolidaySchema = createInsertSchema(
  evaluationTimesheetHoliday
).omit({
  createdAt: true,
  id: true,
});

// --- Evaluation KPI ---

export const selectEvaluationKpiProductivitySchema = createSelectSchema(
  evaluationKpiProductivity
);
export const insertEvaluationKpiProductivitySchema = createInsertSchema(
  evaluationKpiProductivity
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
export const updateEvaluationKpiProductivitySchema =
  insertEvaluationKpiProductivitySchema.partial();

export const selectEvaluationKpiSharingSchema =
  createSelectSchema(evaluationKpiSharing);
export const insertEvaluationKpiSharingSchema = createInsertSchema(
  evaluationKpiSharing
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
export const updateEvaluationKpiSharingSchema =
  insertEvaluationKpiSharingSchema.partial();

export const selectEvaluationKpiQualitySchema =
  createSelectSchema(evaluationKpiQuality);
export const insertEvaluationKpiQualitySchema = createInsertSchema(
  evaluationKpiQuality
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
export const updateEvaluationKpiQualitySchema =
  insertEvaluationKpiQualitySchema.partial();

export const selectEvaluationKpiSummarySchema =
  createSelectSchema(evaluationKpiSummary);
export const insertEvaluationKpiSummarySchema = createInsertSchema(
  evaluationKpiSummary
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
export const updateEvaluationKpiSummarySchema =
  insertEvaluationKpiSummarySchema.partial();

// --- Evaluation Audit Log ---

export const selectEvaluationAuditLogSchema =
  createSelectSchema(evaluationAuditLog);
export const insertEvaluationAuditLogSchema = createInsertSchema(
  evaluationAuditLog
).omit({
  createdAt: true,
  id: true,
});
// --- SystemAIConfig ---

export const selectSystemAiConfigSchema = createSelectSchema(systemAiConfig);
export const insertSystemAiConfigSchema = createInsertSchema(
  systemAiConfig
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

// --- WikiPage ---

export const selectWikiPageSchema = createSelectSchema(wikiPage);
export const insertWikiPageSchema = createInsertSchema(wikiPage).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export const selectWikiPageSourceSchema = createSelectSchema(wikiPageSource);
export const selectWikiPageChunkSchema = createSelectSchema(wikiPageChunk);
