import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc";

interface TicketFilters {
  month?: string;
  employeeIds?: string[];
  projectIds?: string[];
  category?: "bug" | "feature";
  ticket?: string;
  page?: number;
  limit?: number;
}

export function useTickets(filters: TicketFilters = {}) {
  const { page = 1, limit = 10, ...rest } = filters;
  return useQuery(
    orpc.evaluation.ticket.list.queryOptions({
      input: { ...rest, limit, page },
      placeholderData: keepPreviousData,
    })
  );
}

export function useTicket(id: string) {
  return useQuery(orpc.evaluation.ticket.get.queryOptions({ input: { id } }));
}

/** Latest YYYY-MM that has ticket data, or null when the table is empty. */
export function useLatestTicketMonth() {
  return useQuery(orpc.evaluation.ticket.latestMonth.queryOptions());
}

export function useTicketDevelopers() {
  return useQuery(orpc.evaluation.ticket.listDevelopers.queryOptions());
}

export function useTicketProjects() {
  return useQuery(orpc.evaluation.ticket.listProjects.queryOptions());
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.evaluation.ticket.create.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to create ticket");
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.evaluation.ticket.list.queryOptions().queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: orpc.evaluation.kpi.listSummary.queryOptions().queryKey,
          refetchType: "all",
        });
        queryClient.invalidateQueries({
          queryKey:
            orpc.evaluation.kpi.listProductivity.queryOptions().queryKey,
          refetchType: "all",
        });
        toast.success("Ticket created successfully");
      },
    })
  );
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.evaluation.ticket.update.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to update ticket");
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.evaluation.ticket.list.queryOptions().queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: orpc.evaluation.kpi.listSummary.queryOptions().queryKey,
          refetchType: "all",
        });
        queryClient.invalidateQueries({
          queryKey:
            orpc.evaluation.kpi.listProductivity.queryOptions().queryKey,
          refetchType: "all",
        });
        toast.success("Ticket updated successfully");
      },
    })
  );
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.evaluation.ticket.delete.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to delete ticket");
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.evaluation.ticket.list.queryOptions().queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: orpc.evaluation.kpi.listSummary.queryOptions().queryKey,
          refetchType: "all",
        });
        queryClient.invalidateQueries({
          queryKey:
            orpc.evaluation.kpi.listProductivity.queryOptions().queryKey,
          refetchType: "all",
        });
        toast.success("Ticket deleted successfully");
      },
    })
  );
}

export function useExportTickets() {
  return useMutation(
    orpc.evaluation.ticket.exportByMonth.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to export tickets");
      },
    })
  );
}

export function useImportTickets() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.evaluation.ticket.import.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to import tickets");
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: orpc.evaluation.ticket.list.queryOptions().queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: orpc.evaluation.kpi.listSummary.queryOptions().queryKey,
          refetchType: "all",
        });
        queryClient.invalidateQueries({
          queryKey:
            orpc.evaluation.kpi.listProductivity.queryOptions().queryKey,
          refetchType: "all",
        });
        toast.success(`Imported ${data.imported} tickets`);
        if (data.errors.length > 0) {
          toast.warning(`${data.errors.length} tickets skipped (duplicates)`);
        }
      },
    })
  );
}

export function useTicketStats(month?: string) {
  return useQuery(
    orpc.evaluation.ticket.stats.queryOptions({
      input: month ? { month } : undefined,
      placeholderData: keepPreviousData,
    })
  );
}

export function useChartData(month: string) {
  return useQuery(
    orpc.evaluation.ticket.chartData.queryOptions({ input: { month } })
  );
}

export function useEfficiencyData(month: string) {
  return useQuery(
    orpc.evaluation.ticket.efficiencyData.queryOptions({
      input: { month },
    })
  );
}
