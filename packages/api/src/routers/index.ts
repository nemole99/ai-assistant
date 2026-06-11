import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { aiModelAssignmentRouter } from "./ai-model-assignment";
import { aiProviderRouter } from "./ai-provider";
import { copilotEvaluationRouter } from "./copilot-evaluation";
import { documentRouter } from "./document";
import { documentCategoryRouter } from "./document-category";
import { departmentRouter, employeeRouter } from "./organization";
import { projectRouter } from "./project";
import { systemAiConfigRouter } from "./system-ai-config";
import { wikiPageRouter } from "./wiki-page";

export const appRouter = {
  aiModelAssignment: aiModelAssignmentRouter,
  aiProvider: aiProviderRouter,
  copilotEvaluation: copilotEvaluationRouter,
  department: departmentRouter,
  document: documentRouter,
  documentCategory: documentCategoryRouter,
  employee: employeeRouter,
  healthCheck: publicProcedure.handler(() => "OK"),
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
