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
  copilotTicket,
  copilotTimesheetEntry,
  copilotTimesheetHoliday,
  copilotKpiProductivity,
  copilotKpiSharing,
  copilotKpiQuality,
  copilotKpiSummary,
  copilotAuditLog,
} from "./copilot-evaluation";

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

// --- Copilot Ticket ---

export const selectCopilotTicketSchema = createSelectSchema(copilotTicket);
export const insertCopilotTicketSchema = createInsertSchema(copilotTicket).omit(
  {
    createdAt: true,
    id: true,
    updatedAt: true,
  }
);
export const updateCopilotTicketSchema = insertCopilotTicketSchema.partial();

// --- Copilot Timesheet ---

export const selectCopilotTimesheetEntrySchema = createSelectSchema(
  copilotTimesheetEntry
);
export const insertCopilotTimesheetEntrySchema = createInsertSchema(
  copilotTimesheetEntry
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export const selectCopilotTimesheetHolidaySchema = createSelectSchema(
  copilotTimesheetHoliday
);
export const insertCopilotTimesheetHolidaySchema = createInsertSchema(
  copilotTimesheetHoliday
).omit({
  createdAt: true,
  id: true,
});

// --- Copilot KPI ---

export const selectCopilotKpiProductivitySchema = createSelectSchema(
  copilotKpiProductivity
);
export const insertCopilotKpiProductivitySchema = createInsertSchema(
  copilotKpiProductivity
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
export const updateCopilotKpiProductivitySchema =
  insertCopilotKpiProductivitySchema.partial();

export const selectCopilotKpiSharingSchema =
  createSelectSchema(copilotKpiSharing);
export const insertCopilotKpiSharingSchema = createInsertSchema(
  copilotKpiSharing
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
export const updateCopilotKpiSharingSchema =
  insertCopilotKpiSharingSchema.partial();

export const selectCopilotKpiQualitySchema =
  createSelectSchema(copilotKpiQuality);
export const insertCopilotKpiQualitySchema = createInsertSchema(
  copilotKpiQuality
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
export const updateCopilotKpiQualitySchema =
  insertCopilotKpiQualitySchema.partial();

export const selectCopilotKpiSummarySchema =
  createSelectSchema(copilotKpiSummary);
export const insertCopilotKpiSummarySchema = createInsertSchema(
  copilotKpiSummary
).omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});
export const updateCopilotKpiSummarySchema =
  insertCopilotKpiSummarySchema.partial();

// --- Copilot Audit Log ---

export const selectCopilotAuditLogSchema = createSelectSchema(copilotAuditLog);
export const insertCopilotAuditLogSchema = createInsertSchema(
  copilotAuditLog
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
