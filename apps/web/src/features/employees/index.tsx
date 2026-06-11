import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { ContentLayout } from "@/components/layout/content-layout";
import { Loader } from "@/components/loader";
import { orpc } from "@/lib/orpc";

import { EmployeesDialogs } from "./components/employees-dialogs";
import { EmployeesPrimaryButtons } from "./components/employees-primary-buttons";
import { EmployeesProvider } from "./components/employees-provider";
import { EmployeesTable } from "./components/employees-table";

const route = getRouteApi("/_authenticated/employees/");

export function Employees() {
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const { data: employees = [], isLoading } = useQuery(
    orpc.employee.list.queryOptions()
  );

  return (
    <ContentLayout>
      <EmployeesProvider>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
            <p className="text-muted-foreground">
              Manage employee records, positions, and department assignments.
            </p>
          </div>
          <EmployeesPrimaryButtons />
        </div>
        {isLoading ? (
          <Loader />
        ) : (
          <EmployeesTable
            data={employees}
            search={search}
            navigate={navigate}
          />
        )}
        <EmployeesDialogs />
      </EmployeesProvider>
    </ContentLayout>
  );
}
