import { useState } from "react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Plus, Upload } from "lucide-react";
import { Main } from "@/components/layout/main";
import { Header } from "@/components/layout/header";
import { ThemeSwitch } from "@/components/theme-switch";
import { ConfigDrawer } from "@/components/config-drawer";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { DataTablePagination } from "@/components/data-table";
import { Loader } from "@/components/loader";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { TicketTable } from "./components/ticket-table";
import { TicketFormDialog } from "./components/ticket-form-dialog";
import { useTickets, useImportTickets, useTicketDevelopers, useTicketProjects } from "./hooks/use-tickets";
import type { CopilotTicket } from "./data/schema";

export function CopilotEvaluationTickets() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [developer, setDeveloper] = useState<string>("");
  const [project, setProject] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data: developers = [] } = useTicketDevelopers();
  const { data: projects = [] } = useTicketProjects();

  const { data: result, isLoading } = useTickets({
    month,
    developer: developer || undefined,
    project: project || undefined,
    category: (category as "bug" | "feature") || undefined,
    ticket: ticketSearch || undefined,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  });
  const importTickets = useImportTickets();

  const tickets = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  const table = useReactTable({
    data: tickets,
    columns: [],
    manualPagination: true,
    pageCount: totalPages,
    rowCount: total,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
  });

  const resetFilters = () => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
    resetFilters();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        await importTickets.mutateAsync({ tickets: data });
      }
    } catch {
      // Try CSV parsing as fallback
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) return;
      const headers = lines[0].split(",");
      const tickets = lines.slice(1).map((line) => {
        const values = line.split(",");
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h.trim()] = values[i]?.trim() ?? "";
        });
        return {
          developer: obj.developer ?? "",
          project: obj.project ?? "",
          category: (obj.category ?? "bug") as "bug" | "feature",
          ticketUrl: obj.ticket ?? obj.ticketUrl ?? "",
          processDate: obj.processDate ?? new Date().toISOString().split("T")[0],
          totalEffort: Number(obj.totalEffort) || 0,
          investigateEstimate: 0,
          investigateActual: Number(obj.investigateActual) || 0,
          codeFixEstimate: 0,
          codeFixActual: Number(obj.codeFixActual) || 0,
          codeReviewEstimate: 0,
          codeReviewActual: Number(obj.codeReviewActual) || 0,
          reopenStatus: Number(obj.reopenStatus) || 0,
          comment: obj.comment ?? "",
        };
      });
      await importTickets.mutateAsync({ tickets });
    }
    e.target.value = "";
  };

  return (
    <>
      <Header fixed>
        <div className="ml-auto flex items-center gap-3">
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main fixed className="flex flex-1 flex-col gap-4 sm:gap-6">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Copilot Evaluation</h2>
            <p className="text-muted-foreground">Track developer effort on tickets and generate KPIs.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="w-40"
            />
            <Button variant="outline" className="relative" onClick={() => document.getElementById("ticket-import-input")?.click()}>
              <Upload className="mr-2 size-4" />
              Import
            </Button>
            <input
              id="ticket-import-input"
              type="file"
              accept=".json,.csv"
              onChange={handleFileImport}
              className="hidden"
            />
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add Ticket
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Select value={developer} onValueChange={(v) => { setDeveloper(v === "all" ? "" : v); resetFilters(); }}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue placeholder="Developer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Developers</SelectItem>
              {developers.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={project} onValueChange={(v) => { setProject(v === "all" ? "" : v); resetFilters(); }}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={(v) => { setCategory(v === "all" ? "" : v); resetFilters(); }}>
            <SelectTrigger className="h-8 w-28">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="feature">Feature</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search ticket..."
            value={ticketSearch}
            onChange={(e) => { setTicketSearch(e.target.value); resetFilters(); }}
            className="h-8 w-40"
          />
        </div>

        {/* Scrollable table */}
        {isLoading ? (
          <Loader />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto rounded-md border">
            <TicketTable tickets={tickets} onEdit={() => {}} />
          </div>
        )}

        {/* Pinned pagination */}
        <div className="shrink-0">
          <DataTablePagination table={table} />
        </div>
      </div>

      <TicketFormDialog open={addOpen} onOpenChange={setAddOpen} />
      </Main>
    </>
  );
}
