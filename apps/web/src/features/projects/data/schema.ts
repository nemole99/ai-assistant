import type { AppRouterClient } from "@workspace/api/routers/index";

export type Project = Awaited<ReturnType<AppRouterClient["project"]["list"]>>[number];
export type ProjectMember = Awaited<ReturnType<AppRouterClient["project"]["listMembers"]>>[number];
