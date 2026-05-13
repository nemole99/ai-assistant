import { Badge } from "@workspace/ui/components/badge";
import { type DocumentStatus } from "../data/schema";

const statusConfig: Record<
  DocumentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "Processing", variant: "secondary" },
  COMPLETED: { label: "Ready", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
