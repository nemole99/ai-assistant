import { Badge } from "@workspace/ui/components/badge";
import { Loader2 } from "lucide-react";
import { type DocumentStatus } from "../data/schema";

const statusConfig: Record<
  DocumentStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    spinning?: boolean;
  }
> = {
  PENDING: { label: "Processing", variant: "secondary", spinning: true },
  COMPLETED: { label: "Ready", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
  INGESTING: { label: "Ingesting", variant: "secondary", spinning: true },
  INGESTED: { label: "Ingested", variant: "default" },
  INGEST_FAILED: { label: "Ingest Failed", variant: "destructive" },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config = statusConfig[status] ?? { label: status, variant: "outline" as const };
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.spinning && <Loader2 size={10} className="animate-spin" />}
      {config.label}
    </Badge>
  );
}
