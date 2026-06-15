import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { aiModelAssignmentRouter } from "./ai-model-assignment";
import { aiProviderRouter } from "./ai-provider";
import { documentRouter } from "./document";
import { documentCategoryRouter } from "./document-category";
import { evaluationRouter } from "./evaluation";
import { issueRouter } from "./issue";
import { departmentRouter, employeeRouter } from "./organization";
import { projectRouter } from "./project";
import { systemAiConfigRouter } from "./system-ai-config";
import { wikiPageRouter } from "./wiki-page";

export const appRouter = {
  aiModelAssignment: aiModelAssignmentRouter,
  aiProvider: aiProviderRouter,
  department: departmentRouter,
  document: documentRouter,
  documentCategory: documentCategoryRouter,
  employee: employeeRouter,
  evaluation: evaluationRouter,
  healthCheck: publicProcedure.handler(() => "OK"),
  issue: issueRouter,
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  project: projectRouter,
  systemAiConfig: systemAiConfigRouter,
  wikiPage: wikiPageRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
