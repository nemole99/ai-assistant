import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";

export function useKpiProductivity() {
  return useQuery(orpc.copilotEvaluation.kpi.listProductivity.queryOptions());
}

export function useKpiSharing() {
  return useQuery(orpc.copilotEvaluation.kpi.listSharing.queryOptions());
}

export function useKpiQuality() {
  return useQuery(orpc.copilotEvaluation.kpi.listQuality.queryOptions());
}

export function useKpiSummary() {
  return useQuery(orpc.copilotEvaluation.kpi.listSummary.queryOptions());
}

export function useUpdateKpiProductivityMonth() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.kpi.updateProductivityMonth.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.copilotEvaluation.kpi.listProductivity.queryOptions().queryKey });
        toast.success("Productivity KPI updated");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update KPI");
      },
    }),
  );
}

export function useUpdateKpiSharingMonth() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.kpi.updateSharingMonth.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.copilotEvaluation.kpi.listSharing.queryOptions().queryKey });
        toast.success("Sharing KPI updated");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update KPI");
      },
    }),
  );
}

export function useUpdateKpiQualityMonth() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.kpi.updateQualityMonth.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.copilotEvaluation.kpi.listQuality.queryOptions().queryKey });
        toast.success("Quality KPI updated");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update KPI");
      },
    }),
  );
}

export function useUpdateKpiQualityTotalByMar() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.kpi.updateQualityTotalByMar.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.copilotEvaluation.kpi.listQuality.queryOptions().queryKey });
        toast.success("Quality total updated");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update total");
      },
    }),
  );
}

export function useUpdateKpiSummaryComment() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.kpi.updateSummaryComment.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.copilotEvaluation.kpi.listSummary.queryOptions().queryKey });
        toast.success("Comment updated");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update comment");
      },
    }),
  );
}
