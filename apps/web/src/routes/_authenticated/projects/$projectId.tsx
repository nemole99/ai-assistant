import { createFileRoute } from "@tanstack/react-router";
import { ProjectDetail } from "@/features/projects/project-detail";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { projectId } = Route.useParams();
  return <ProjectDetail projectId={projectId} />;
}
