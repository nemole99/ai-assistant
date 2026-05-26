import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import {
  department,
  document,
  documentCategory,
  employee,
  project,
  projectMember,
  user,
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
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateDepartmentSchema = insertDepartmentSchema.partial();

// --- Employee ---

export const selectEmployeeSchema = createSelectSchema(employee);
export const insertEmployeeSchema = createInsertSchema(employee)
  .omit({
    id: true,
    userId: true,
    status: true,
    createdAt: true,
    updatedAt: true,
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
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateProjectSchema = insertProjectSchema.partial();

export const selectProjectMemberSchema = createSelectSchema(projectMember);

// --- DocumentCategory ---

export const selectDocumentCategorySchema = createSelectSchema(documentCategory);
export const insertDocumentCategorySchema = createInsertSchema(documentCategory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateDocumentCategorySchema = insertDocumentCategorySchema.partial();

// --- Document ---

export const selectDocumentSchema = createSelectSchema(document);
export const insertDocumentSchema = createInsertSchema(document).omit({
  id: true,
  status: true,
  markdownContent: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
});
export const updateDocumentSchema = insertDocumentSchema
  .pick({ title: true, description: true, categoryId: true })
  .partial();

// --- Copilot Ticket ---

export const selectCopilotTicketSchema = createSelectSchema(copilotTicket);
export const insertCopilotTicketSchema = createInsertSchema(copilotTicket).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateCopilotTicketSchema = insertCopilotTicketSchema.partial();

// --- Copilot Timesheet ---

export const selectCopilotTimesheetEntrySchema = createSelectSchema(copilotTimesheetEntry);
export const insertCopilotTimesheetEntrySchema = createInsertSchema(copilotTimesheetEntry).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectCopilotTimesheetHolidaySchema = createSelectSchema(copilotTimesheetHoliday);
export const insertCopilotTimesheetHolidaySchema = createInsertSchema(copilotTimesheetHoliday).omit(
  {
    id: true,
    createdAt: true,
  },
);

// --- Copilot KPI ---

export const selectCopilotKpiProductivitySchema = createSelectSchema(copilotKpiProductivity);
export const insertCopilotKpiProductivitySchema = createInsertSchema(copilotKpiProductivity).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateCopilotKpiProductivitySchema = insertCopilotKpiProductivitySchema.partial();

export const selectCopilotKpiSharingSchema = createSelectSchema(copilotKpiSharing);
export const insertCopilotKpiSharingSchema = createInsertSchema(copilotKpiSharing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateCopilotKpiSharingSchema = insertCopilotKpiSharingSchema.partial();

export const selectCopilotKpiQualitySchema = createSelectSchema(copilotKpiQuality);
export const insertCopilotKpiQualitySchema = createInsertSchema(copilotKpiQuality).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateCopilotKpiQualitySchema = insertCopilotKpiQualitySchema.partial();

export const selectCopilotKpiSummarySchema = createSelectSchema(copilotKpiSummary);
export const insertCopilotKpiSummarySchema = createInsertSchema(copilotKpiSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateCopilotKpiSummarySchema = insertCopilotKpiSummarySchema.partial();

// --- Copilot Audit Log ---

export const selectCopilotAuditLogSchema = createSelectSchema(copilotAuditLog);
export const insertCopilotAuditLogSchema = createInsertSchema(copilotAuditLog).omit({
  id: true,
  createdAt: true,
});
