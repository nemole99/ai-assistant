import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { toast } from "sonner";

export function useTimesheetMonth(month: string) {
  return useQuery(
    orpc.copilotEvaluation.timesheet.getMonth.queryOptions({ input: { month } }),
  );
}

export function useTimesheetEmployees() {
  return useQuery(orpc.copilotEvaluation.timesheet.listEmployees.queryOptions());
}

export function useAddTimesheetEmployee() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.timesheet.addEmployee.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey).includes("getMonth") });
        toast.success("Employee added to timesheet");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add employee");
      },
    }),
  );
}

export function useUpdateTimesheetCell() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.timesheet.updateCell.mutationOptions({
      onMutate: async (input) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ predicate: (q) => JSON.stringify(q.queryKey).includes("getMonth") });

        // Snapshot previous value
        const queryKey = orpc.copilotEvaluation.timesheet.getMonth.queryOptions({ input: { month: input.month } }).queryKey;
        const previous = queryClient.getQueryData(queryKey);

        // Optimistically update the cache
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            employees: old.employees.map((emp: any) =>
              emp.name === input.employee
                ? { ...emp, days: { ...emp.days, [input.day]: input.value } }
                : emp,
            ),
          };
        });

        return { previous, queryKey };
      },
      onError: (_err, _input, context) => {
        // Rollback on error
        if (context?.previous) {
          queryClient.setQueryData(context.queryKey, context.previous);
        }
        toast.error("Failed to update cell");
      },
      onSettled: () => {
        queryClient.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey).includes("getMonth") });
      },
    }),
  );
}

export function useSetTimesheetHolidays() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.copilotEvaluation.timesheet.setHolidays.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey).includes("getMonth") });
        toast.success("Holidays updated");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to set holidays");
      },
    }),
  );
}
