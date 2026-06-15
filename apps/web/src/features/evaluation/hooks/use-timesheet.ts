import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc";

export function useTimesheetMonth(month: string) {
  return useQuery(
    orpc.evaluation.timesheet.getMonth.queryOptions({ input: { month } })
  );
}

/** Latest YYYY-MM that has timesheet data, or null when the table is empty. */
export function useLatestTimesheetMonth() {
  return useQuery(orpc.evaluation.timesheet.latestMonth.queryOptions());
}

export function useTimesheetEmployees() {
  return useQuery(orpc.evaluation.timesheet.listEmployees.queryOptions());
}

export function useAddTimesheetEmployee() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.evaluation.timesheet.addEmployee.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to add employee");
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          predicate: (q) => JSON.stringify(q.queryKey).includes("getMonth"),
        });
        toast.success("Employee added to timesheet");
      },
    })
  );
}

export function useUpdateTimesheetCell() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.evaluation.timesheet.updateCell.mutationOptions({
      onError: (_err, _input, context: any) => {
        if (context?.previous) {
          queryClient.setQueryData(context.queryKey, context.previous);
        }
        toast.error("Failed to update cell");
      },
      onMutate: async (input) => {
        await queryClient.cancelQueries({
          predicate: (q) => JSON.stringify(q.queryKey).includes("getMonth"),
        });

        const { queryKey } = orpc.evaluation.timesheet.getMonth.queryOptions({
          input: { month: input.month },
        });
        const previous = queryClient.getQueryData(queryKey);

        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) {
            return old;
          }
          return {
            ...old,
            employees: old.employees.map((emp: any) =>
              emp.employeeId === input.employeeId
                ? { ...emp, days: { ...emp.days, [input.day]: input.value } }
                : emp
            ),
          };
        });

        return { previous, queryKey };
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          predicate: (q) => JSON.stringify(q.queryKey).includes("getMonth"),
        });
      },
    })
  );
}

export function useSetTimesheetHolidays() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.evaluation.timesheet.setHolidays.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Failed to set holidays");
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          predicate: (q) => JSON.stringify(q.queryKey).includes("getMonth"),
        });
        toast.success("Holidays updated");
      },
    })
  );
}
