import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";
import type { CopilotTicket } from "../data/schema";

type TicketFilters = {
  month?: string;
  developer?: string;
  project?: string;
  category?: "bug" | "feature";
  ticket?: string;
  page?: number;
  limit?: number;
};

export function useTickets(filters: TicketFilters = {}) {
  const { page = 1, limit = 10, ...rest } = filters;
  return useQuery(
    orpc.copilotEvaluation.ticket.list.queryOptions({
      input: { ...rest, page, limit },
      placeholderData: keepPreviousData,
    }),
  );
}

export function useTicket(id: string) {
  return useQuery(orpc.copilotEvaluation.ticket.get.queryOptions({ input: { id } }));
}

export function useTicketDevelopers() {
  return useQuery(orpc.copilotEvaluation.ticket.listDevelopers.queryOptions());
}

export function useTicketProjects() {
  return useQuery(orpc.copilotEvaluation.ticket.listProjects.queryOptions());
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.ticket.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.copilotEvaluation.ticket.list.queryOptions().queryKey });
        toast.success("Ticket created successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create ticket");
      },
    }),
  );
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.ticket.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.copilotEvaluation.ticket.list.queryOptions().queryKey });
        toast.success("Ticket updated successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update ticket");
      },
    }),
  );
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.ticket.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.copilotEvaluation.ticket.list.queryOptions().queryKey });
        toast.success("Ticket deleted successfully");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete ticket");
      },
    }),
  );
}

export function useImportTickets() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.ticket.import.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: orpc.copilotEvaluation.ticket.list.queryOptions().queryKey });
        toast.success(`Imported ${data.imported} tickets`);
        if (data.errors.length > 0) {
          toast.warning(`${data.errors.length} tickets skipped (duplicates)`);
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to import tickets");
      },
    }),
  );
}

export function useChartData(month: string) {
  return useQuery(
    orpc.copilotEvaluation.ticket.chartData.queryOptions({ input: { month } }),
  );
}

export function useEfficiencyData(month: string) {
  return useQuery(
    orpc.copilotEvaluation.ticket.efficiencyData.queryOptions({ input: { month } }),
  );
}
