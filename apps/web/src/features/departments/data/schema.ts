import type { AppRouterClient } from "@workspace/api/routers/index";

export type Department = Awaited<ReturnType<AppRouterClient["department"]["list"]>>[number];
