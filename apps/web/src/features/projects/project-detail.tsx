import { useQuery } from "@tanstack/react-query";
import { FolderKanban, ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
import { ContentLayout } from "@/components/layout/content-layout";
import { Loader } from "@/components/loader";
import { orpc } from "@/lib/orpc";
import { ProjectMembersTab } from "./components/project-members-tab";
import { ProjectsProvider } from "./components/projects-provider";
import { ProjectsDialogs } from "./components/projects-dialogs";

type ProjectDetailProps = {
  projectId: string;
};

function ProjectDetailInner({ projectId }: ProjectDetailProps) {
  const { data: project, isLoading: projectLoading } = useQuery(
    orpc.project.get.queryOptions({ input: { id: projectId } }),
  );

  const { data: members = [], isLoading: membersLoading } = useQuery(
    orpc.project.listMembers.queryOptions({ input: { projectId } }),
  );

  if (projectLoading) return <Loader />;
  if (!project) return null;

  return (
    <ContentLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            to="/projects"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                <FolderKanban className="size-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {project.name}
                </h2>
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Badge
                    variant={
                      project.status === "ACTIVE" ? "default" : "secondary"
                    }
                  >
                    {project.status === "ACTIVE" ? (
                      <Clock className="mr-1 size-3" />
                    ) : (
                      <CheckCircle2 className="mr-1 size-3" />
                    )}
                    {project.status === "ACTIVE" ? "Active" : "Completed"}
                  </Badge>
                  {project.managerName && (
                    <span>Manager: {project.managerName}</span>
                  )}
                </div>
              </div>
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-3 text-sm">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">
              Members ({project.memberCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="text-muted-foreground rounded-lg border p-6 text-center text-sm">
              Document uploads and knowledge base coming in a future release.
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            {membersLoading ? (
              <Loader />
            ) : (
              <ProjectMembersTab
                projectId={projectId}
                managerId={project.managerId}
                members={members}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
      <ProjectsDialogs />
    </ContentLayout>
  );
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  return (
    <ProjectsProvider>
      <ProjectDetailInner projectId={projectId} />
    </ProjectsProvider>
  );
}
