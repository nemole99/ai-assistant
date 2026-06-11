import { useQuery } from "@tanstack/react-query";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Building2 } from "lucide-react";

import { ContentLayout } from "@/components/layout/content-layout";
import { Loader } from "@/components/loader";
import { orpc } from "@/lib/orpc";

import { DepartmentCard } from "./components/department-card";
import { DepartmentsDialogs } from "./components/departments-dialogs";
import { DepartmentsPrimaryButtons } from "./components/departments-primary-buttons";
import { DepartmentsProvider } from "./components/departments-provider";

export function Departments() {
  const { data: departments = [], isLoading } = useQuery(
    orpc.department.list.queryOptions()
  );

  return (
    <ContentLayout>
      <DepartmentsProvider>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Departments</h2>
            <p className="text-muted-foreground">
              Organize employees into departments and manage knowledge access.
            </p>
          </div>
          <DepartmentsPrimaryButtons />
        </div>
        {isLoading ? (
          <Loader />
        ) : (departments.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Building2 />
              </EmptyMedia>
              <EmptyTitle>No departments yet</EmptyTitle>
              <EmptyDescription>
                Get started by creating your first department to organize
                employees and manage knowledge access.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <DepartmentsPrimaryButtons />
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((department) => (
              <DepartmentCard key={department.id} department={department} />
            ))}
          </div>
        ))}
        <DepartmentsDialogs />
      </DepartmentsProvider>
    </ContentLayout>
  );
}
