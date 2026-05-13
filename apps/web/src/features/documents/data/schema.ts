import type { AppRouterClient } from "@/lib/orpc";

export type Document = Awaited<
  ReturnType<AppRouterClient["document"]["list"]>
>[number];

export type DocumentCategory = Awaited<
  ReturnType<AppRouterClient["documentCategory"]["list"]>
>[number];

export type DocumentStatus = Document["status"];
