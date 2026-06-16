import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Ticket,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  useFetchJiraTickets,
  useJiraConfig,
  useSubmitJiraTickets,
} from "../hooks/use-tickets";

type Period = "this_week" | "last_week" | "this_month" | "last_month";

interface PreviewRow {
  alreadyAdded: boolean;
  category: "bug" | "feature";
  checked: boolean;
  comment: string | undefined;
  processDate: string;
  projectId: string | null;
  projectWarning: boolean;
  ticketUrl: string;
  totalEffort: number | null | undefined;
}

interface Project {
  id: string;
  name: string;
}

interface TicketSyncDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const PERIOD_ITEMS = [
  { label: "This week", value: "this_week" },
  { label: "Last week", value: "last_week" },
  { label: "This month", value: "this_month" },
  { label: "Last month", value: "last_month" },
] as const;

const CATEGORY_ITEMS = [
  { label: "Bug", value: "bug" },
  { label: "Feature", value: "feature" },
] as const;

export function TicketSyncDialog({
  open,
  onOpenChange,
}: TicketSyncDialogProps) {
  const navigate = useNavigate();
  const { data: config, isPending: configPending } = useJiraConfig();
  const fetchTickets = useFetchJiraTickets();
  const submitTickets = useSubmitJiraTickets();

  const [period, setPeriod] = useState<Period>("this_week");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [fetched, setFetched] = useState(false);

  const projectItems = useMemo(
    () => projects.map((p) => ({ label: p.name, value: p.id })),
    [projects]
  );

  const handleClose = () => {
    setRows([]);
    setFetched(false);
    onOpenChange(false);
  };

  const handleFetch = async () => {
    const result = await fetchTickets.mutateAsync({ period });
    setProjects(result.projects);
    setRows(
      result.tickets.map((t) => ({
        alreadyAdded: t.alreadyAdded,
        category: t.category,
        checked: !t.alreadyAdded,
        comment: t.comment,
        processDate: t.processDate,
        projectId: t.projectId ?? null,
        projectWarning: t.projectWarning,
        ticketUrl: t.ticketUrl,
        totalEffort: t.totalEffort ?? null,
      }))
    );
    setFetched(true);
  };

  const handleSubmit = async () => {
    const selected = rows.filter(
      (r) => r.checked && !r.alreadyAdded && r.projectId
    );
    await submitTickets.mutateAsync({
      tickets: selected.map((r) => ({
        category: r.category,
        comment: r.comment,
        processDate: r.processDate,
        projectId: r.projectId!,
        ticketUrl: r.ticketUrl,
        totalEffort: r.totalEffort ?? undefined,
      })),
    });
    handleClose();
  };

  const updateRow = (index: number, patch: Partial<PreviewRow>) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
  };

  const toggleAll = (checked: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.alreadyAdded ? r : { ...r, checked }))
    );
  };

  const checkedCount = rows.filter((r) => r.checked && !r.alreadyAdded).length;
  const submittable =
    checkedCount > 0 &&
    rows.filter((r) => r.checked && !r.alreadyAdded && !r.projectId).length ===
      0;

  useEffect(() => {
    setRows([]);
    setFetched(false);
  }, [period]);

  const noPat = !configPending && !config?.configured;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className={cn(
          "flex flex-col transition-all duration-300",
          rows.length > 0
            ? "w-[95vw] sm:w-[95vw] sm:max-w-[95vw] h-[90vh] max-h-[90vh]"
            : "sm:max-w-md"
        )}
      >
        <DialogHeader>
          <DialogTitle>Sync from Jira</DialogTitle>
          <DialogDescription>
            Fetch your resolved Jira tickets and add selected ones to your
            evaluation.
          </DialogDescription>
        </DialogHeader>

        {noPat ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertTriangle className="size-8 text-amber-500" />
            <p className="text-sm text-muted-foreground">
              No Jira PAT configured. Set it up in Settings first.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                handleClose();
                navigate({ to: "/settings/jira" });
              }}
            >
              Go to Settings → Jira
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Select
                items={PERIOD_ITEMS}
                value={period}
                onValueChange={(v) => setPeriod(v as Period)}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={handleFetch}
                disabled={fetchTickets.isPending}
              >
                <RefreshCw className="size-4 mr-2" />
                {fetched ? "Refresh" : "Fetch"}
              </Button>
            </div>

            {fetchTickets.isPending && (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground">
                <Loader2 className="size-8 animate-spin opacity-40" />
                <p className="text-sm">Fetching tickets…</p>
              </div>
            )}

            {fetched && rows.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center text-muted-foreground">
                <div className="rounded-full bg-muted p-4">
                  <Ticket className="size-8 opacity-40" />
                </div>
                <p className="text-sm font-medium">No resolved tickets found</p>
                <p className="text-xs">Try a different period.</p>
              </div>
            )}

            {rows.length > 0 && (
              <div className="overflow-auto flex-1 min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox
                          checked={rows
                            .filter((r) => !r.alreadyAdded)
                            .every((r) => r.checked)}
                          onCheckedChange={(v) => toggleAll(!!v)}
                        />
                      </TableHead>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead className="w-44">Project</TableHead>
                      <TableHead className="w-28">Category</TableHead>
                      <TableHead className="w-28">Resolved</TableHead>
                      <TableHead className="w-24">Effort (h)</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => (
                      <TableRow
                        key={row.ticketUrl}
                        className={row.alreadyAdded ? "opacity-50" : undefined}
                      >
                        <TableCell>
                          <Checkbox
                            checked={row.checked}
                            disabled={row.alreadyAdded}
                            onCheckedChange={(v) =>
                              updateRow(i, { checked: !!v })
                            }
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          <a
                            href={row.ticketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:underline text-primary"
                          >
                            {row.ticketUrl.split("/browse/")[1]}
                            <ExternalLink className="size-3" />
                          </a>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm">
                          {row.comment}
                        </TableCell>
                        <TableCell>
                          <Select
                            items={projectItems}
                            value={row.projectId ?? ""}
                            onValueChange={(v) =>
                              updateRow(i, {
                                projectId: v || null,
                                projectWarning: !v,
                              })
                            }
                            disabled={row.alreadyAdded}
                          >
                            <SelectTrigger
                              className={
                                row.projectWarning && !row.alreadyAdded
                                  ? "border-b-amber-500"
                                  : undefined
                              }
                            >
                              <SelectValue placeholder="Pick project…" />
                            </SelectTrigger>
                            <SelectContent>
                              {projectItems.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            items={CATEGORY_ITEMS}
                            value={row.category}
                            onValueChange={(v) =>
                              updateRow(i, {
                                category: v as "bug" | "feature",
                              })
                            }
                            disabled={row.alreadyAdded}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_ITEMS.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.processDate}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            className="w-20 h-8 text-sm"
                            value={row.totalEffort ?? ""}
                            disabled={row.alreadyAdded}
                            onChange={(e) =>
                              updateRow(i, {
                                totalEffort: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {row.alreadyAdded ? (
                            <Badge variant="secondary" className="text-xs">
                              Added
                            </Badge>
                          ) : row.projectWarning ? (
                            <Badge
                              variant="outline"
                              className="text-xs text-amber-600 border-amber-400"
                            >
                              Pick project
                            </Badge>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {!noPat && fetched && rows.length > 0 && (
            <Button
              disabled={!submittable || submitTickets.isPending}
              onClick={handleSubmit}
            >
              {submitTickets.isPending && (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              )}
              Add {checkedCount} ticket{checkedCount !== 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
