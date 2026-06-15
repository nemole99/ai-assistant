import { getRouteApi } from "@tanstack/react-router";

import { ContentLayout } from "@/components/layout/content-layout";
import { Loader } from "@/components/loader";
import { MonthPicker } from "@/components/month-picker";

import { TicketsProvider } from "./components/ticket-context";
import { TicketDialogs } from "./components/ticket-dialogs";
import { TicketPrimaryButtons } from "./components/ticket-primary-buttons";
import { TicketTable } from "./components/ticket-table";
import { currentYearMonth } from "./hooks/use-month";
import {
  useTickets,
  useTicketDevelopers,
  useTicketProjects,
  useLatestTicketMonth,
} from "./hooks/use-tickets";

const route = getRouteApi("/_authenticated/evaluation/");

export function EvaluationTickets() {
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const { data: latest } = useLatestTicketMonth();
  const month = search.month || latest?.month || currentYearMonth();

  const { data: developers = [] } = useTicketDevelopers();
  const { data: projects = [] } = useTicketProjects();

  const { data: result, isLoading } = useTickets({
    category: search.category?.[0] as "bug" | "feature" | undefined,
    employeeId: search.employee?.[0],
    limit: search.pageSize ?? 10,
    month,
    page: search.page ?? 1,
    projectId: search.project?.[0],
    ticket: search.ticket || undefined,
  });

  const handleMonthChange = (newMonth: string) => {
    navigate({
      search: (prev) => ({ ...prev, month: newMonth, page: undefined }),
    });
  };

  return (
    <ContentLayout>
      <TicketsProvider>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Evaluation</h2>
            <p className="text-muted-foreground">
              Track developer effort on tickets and generate KPIs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MonthPicker value={month} onChange={handleMonthChange} />
            <TicketPrimaryButtons />
          </div>
        </div>
        {isLoading ? (
          <Loader />
        ) : (
          <TicketTable
            data={result?.data ?? []}
            search={search}
            navigate={navigate}
            developers={developers}
            projects={projects}
            pageCount={result?.totalPages ?? 1}
            rowCount={result?.total ?? 0}
          />
        )}
        <TicketDialogs />
      </TicketsProvider>
    </ContentLayout>
  );
}
