import { createFileRoute } from "@tanstack/react-router";

import { ContentLayout } from "@/components/layout/content-layout";
import { ForbiddenError } from "@/features/errors/forbidden";
import { GeneralError } from "@/features/errors/general-error";
import { MaintenanceError } from "@/features/errors/maintenance-error";
import { NotFoundError } from "@/features/errors/not-found-error";
import { UnauthorisedError } from "@/features/errors/unauthorized-error";

export const Route = createFileRoute("/_authenticated/errors/$error")({
  component: RouteComponent,
});

// eslint-disable-next-line react-refresh/only-export-components
function RouteComponent() {
  const { error } = Route.useParams();

  const errorMap: Record<string, React.ComponentType> = {
    forbidden: ForbiddenError,
    "internal-server-error": GeneralError,
    "maintenance-error": MaintenanceError,
    "not-found": NotFoundError,
    unauthorized: UnauthorisedError,
  };
  const ErrorComponent = errorMap[error] || NotFoundError;

  return (
    <ContentLayout>
      <div className="flex-1 [&>div]:h-full">
        <ErrorComponent />
      </div>
    </ContentLayout>
  );
}
