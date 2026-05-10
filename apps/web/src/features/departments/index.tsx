import { ContentLayout } from "@/components/layout/content-layout";
import { DepartmentCard } from "./components/department-card";
import { DepartmentsDialogs } from "./components/departments-dialogs";
import { DepartmentsPrimaryButtons } from "./components/departments-primary-buttons";
import { DepartmentsProvider } from "./components/departments-provider";
import { departments } from "./data/departments";

export function Departments() {
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((department) => (
            <DepartmentCard key={department.id} department={department} />
          ))}
        </div>
        <DepartmentsDialogs />
      </DepartmentsProvider>
    </ContentLayout>
  );
}
