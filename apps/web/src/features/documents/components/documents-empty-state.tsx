import { ReactNode } from "react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";

interface DocumentsEmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function DocumentsEmptyState({
  icon,
  title,
  description,
  action,
}: DocumentsEmptyStateProps) {
  return (
    <Empty className="border border-dashed">
      <EmptyMedia variant="icon">{icon}</EmptyMedia>
      <EmptyContent>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
        {action}
      </EmptyContent>
    </Empty>
  );
}
