import { getRouteApi } from "@tanstack/react-router";

import { Loader } from "@/components/loader";
import { MonthPicker } from "@/components/month-picker";

import { TicketsTour } from "./components/evaluation-tour";
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
  useTicketStats,
} from "./hooks/use-tickets";
import { useTour } from "./hooks/use-tour";

const route = getRouteApi("/_authenticated/evaluation/");

// oxlint-disable-next-line complexity
export function EvaluationTickets() {
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const { open, setOpen } = useTour("tickets");

  const { data: latest } = useLatestTicketMonth();
  const month = search.month || latest?.month || currentYearMonth();

  const { data: developers = [] } = useTicketDevelopers();
  const { data: projects = [] } = useTicketProjects();

  const { data: stats } = useTicketStats(month);

  const { data: result, isLoading } = useTickets({
    category: search.category?.[0] as "bug" | "feature" | undefined,
    employeeIds: search.employee?.length ? search.employee : undefined,
    limit: search.pageSize ?? 10,
    month,
    page: search.page ?? 1,
    projectIds: search.project?.length ? search.project : undefined,
    ticket: search.ticket || undefined,
  });

  const handleMonthChange = (newMonth: string) => {
    navigate({
      search: (prev) => ({ ...prev, month: newMonth, page: undefined }),
    });
  };

  return (
    <>
      <TicketsProvider>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Tickets</h2>
            <p className="text-muted-foreground">
              Track developer effort on tickets and generate KPIs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div data-tour="month-picker">
              <MonthPicker value={month} onChange={handleMonthChange} />
            </div>
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
            stats={stats}
          />
        )}
        <TicketDialogs />
      </TicketsProvider>
      <TicketsTour open={open} onOpenChange={setOpen} />
    </>
  );
}
