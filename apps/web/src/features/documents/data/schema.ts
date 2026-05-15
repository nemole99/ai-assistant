import type { AppRouterClient } from "@workspace/api/routers/index";

export type Document = Awaited<ReturnType<AppRouterClient["document"]["list"]>>[number];

export type DocumentCategory = Awaited<
  ReturnType<AppRouterClient["documentCategory"]["list"]>
>[number];

export type DocumentStatus = Document["status"];
