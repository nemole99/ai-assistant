import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc";

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
      onError: (error) => {
        toast.error(error.message || "Failed to update KPI");
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey:
            orpc.copilotEvaluation.kpi.listProductivity.queryOptions().queryKey,
        });
        toast.success("Productivity KPI updated");
      },
    })
  );
}

export function useUpdateKpiSharingMonth() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.kpi.updateSharingMonth.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to update KPI");
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey:
            orpc.copilotEvaluation.kpi.listSharing.queryOptions().queryKey,
        });
        toast.success("Sharing KPI updated");
      },
    })
  );
}

export function useUpdateKpiQualityMonth() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.kpi.updateQualityMonth.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to update KPI");
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey:
            orpc.copilotEvaluation.kpi.listQuality.queryOptions().queryKey,
        });
        toast.success("Quality KPI updated");
      },
    })
  );
}

export function useUpdateKpiQualityTotalByMar() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.kpi.updateQualityTotalByMar.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to update total");
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey:
            orpc.copilotEvaluation.kpi.listQuality.queryOptions().queryKey,
        });
        toast.success("Quality total updated");
      },
    })
  );
}

export function useUpdateKpiSummaryComment() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.kpi.updateSummaryComment.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to update comment");
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey:
            orpc.copilotEvaluation.kpi.listSummary.queryOptions().queryKey,
        });
        toast.success("Comment updated");
      },
    })
  );
}
