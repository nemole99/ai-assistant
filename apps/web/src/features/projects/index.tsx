import { useQuery } from "@tanstack/react-query";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { FolderKanban } from "lucide-react";

import { ContentLayout } from "@/components/layout/content-layout";
import { Loader } from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

import { ProjectCard } from "./components/project-card";
import { ProjectsDialogs } from "./components/projects-dialogs";
import { ProjectsPrimaryButtons } from "./components/projects-primary-buttons";
import { ProjectsProvider } from "./components/projects-provider";

export function Projects() {
  const { data: projects = [], isLoading } = useQuery(
    orpc.project.list.queryOptions()
  );
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <ContentLayout>
      <ProjectsProvider>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
            <p className="text-muted-foreground">
              Manage projects and their team members.
            </p>
          </div>
          {isAdmin && <ProjectsPrimaryButtons />}
        </div>
        {isLoading ? (
          <Loader />
        ) : (projects.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderKanban />
              </EmptyMedia>
              <EmptyTitle>No projects yet</EmptyTitle>
              <EmptyDescription>
                Get started by creating your first project to organize employees
                and manage knowledge.
              </EmptyDescription>
            </EmptyHeader>
            {isAdmin && (
              <EmptyContent>
                <ProjectsPrimaryButtons />
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ))}
        <ProjectsDialogs />
      </ProjectsProvider>
    </ContentLayout>
  );
}
