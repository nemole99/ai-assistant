import { Badge } from "@workspace/ui/components/badge";
import { Loader2 } from "lucide-react";

import type { DocumentStatus } from "../data/schema";

const statusConfig: Record<
  DocumentStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    spinning?: boolean;
  }
> = {
  COMPLETED: { label: "Ready", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
  INGESTED: { label: "Ingested", variant: "default" },
  INGESTING: { label: "Ingesting", spinning: true, variant: "secondary" },
  INGEST_FAILED: { label: "Ingest Failed", variant: "destructive" },
  PENDING: { label: "Processing", spinning: true, variant: "secondary" },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config = statusConfig[status] ?? {
    label: status,
    variant: "outline" as const,
  };
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.spinning && <Loader2 size={10} className="animate-spin" />}
      {config.label}
    </Badge>
  );
}
