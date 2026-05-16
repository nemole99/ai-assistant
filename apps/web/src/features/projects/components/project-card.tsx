import { Link } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  FolderKanban,
  Pencil,
  Trash2,
  Users,
  CheckCircle2,
  Clock,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";

import type { Project } from "../data/schema";
import { useProjects } from "./projects-provider";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { setOpen, setCurrentRow } = useProjects();
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="group block"
    >
      <Card className="flex flex-col cursor-pointer transition-all group-hover:border-primary/50 group-hover:shadow-md">
        <CardHeader className="flex-row items-start gap-3 space-y-0">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
            <FolderKanban className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg leading-tight">
                {project.name}
              </CardTitle>
              <Badge
                variant={project.status === "ACTIVE" ? "default" : "secondary"}
                className="shrink-0"
              >
                {project.status === "ACTIVE" ? (
                  <Clock className="mr-1 size-3" />
                ) : (
                  <CheckCircle2 className="mr-1 size-3" />
                )}
                {project.status === "ACTIVE" ? "Active" : "Completed"}
              </Badge>
            </div>
            <CardDescription className="flex items-center gap-1 mt-0.5">
              <Users className="size-3.5" />
              {project.memberCount} member{project.memberCount !== 1 ? "s" : ""}
              {project.managerName && (
                <span className="text-muted-foreground">
                  · {project.managerName}
                </span>
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex-1">
          {project.description && (
            <p className="text-muted-foreground text-sm line-clamp-2">
              {project.description}
            </p>
          )}
        </CardContent>
        {isAdmin && (
          <CardFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={(e) => {
                e.preventDefault();
                setCurrentRow(project);
                setOpen("edit");
              }}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                setCurrentRow(project);
                setOpen("delete");
              }}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </CardFooter>
        )}
      </Card>{" "}
    </Link>
  );
}
