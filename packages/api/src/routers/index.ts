import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { departmentRouter, employeeRouter } from "./organization";
import { aiProviderRouter } from "./ai-provider";
import { aiModelAssignmentRouter } from "./ai-model-assignment";
import { projectRouter } from "./project";
import { documentCategoryRouter } from "./document-category";
import { documentRouter } from "./document";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  department: departmentRouter,
  employee: employeeRouter,
  aiProvider: aiProviderRouter,
  aiModelAssignment: aiModelAssignmentRouter,
  project: projectRouter,
  documentCategory: documentCategoryRouter,
  document: documentRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
