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

// --- SystemAIConfig ---

export const selectSystemAiConfigSchema = createSelectSchema(systemAiConfig);
export const insertSystemAiConfigSchema = createInsertSchema(systemAiConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// --- WikiPage ---

export const selectWikiPageSchema = createSelectSchema(wikiPage);
export const insertWikiPageSchema = createInsertSchema(wikiPage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectWikiPageSourceSchema = createSelectSchema(wikiPageSource);
export const selectWikiPageChunkSchema = createSelectSchema(wikiPageChunk);
