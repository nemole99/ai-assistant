import { useForm } from "@tanstack/react-form";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

import type { EvaluationTicket } from "../data/schema";
import {
  useCreateTicket,
  useUpdateTicket,
  useTicketDevelopers,
  useTicketProjects,
} from "../hooks/use-tickets";

interface TicketFormDialogProps {
  currentRow?: EvaluationTicket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// oxlint-disable-next-line complexity
export function TicketFormDialog({
  currentRow,
  open,
  onOpenChange,
}: TicketFormDialogProps) {
  const isEdit = !!currentRow;
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const createTicket = useCreateTicket();
  const updateTicket = useUpdateTicket();
  const { data: developers = [] } = useTicketDevelopers();
  const { data: projects = [] } = useTicketProjects();

  const isPending = createTicket.isPending || updateTicket.isPending;

  const form = useForm({
    defaultValues: {
      category: (currentRow?.category ?? "") as "" | "bug" | "feature",
      comment: currentRow?.comment ?? "",
      employeeId: currentRow?.employeeId ?? "",
      processDate:
        currentRow?.processDate ?? new Date().toISOString().split("T")[0]!,
      projectId: currentRow?.projectId ?? "",
      ticketUrl: currentRow?.ticketUrl ?? "",
      totalEffort: currentRow?.totalEffort ?? 16,
    },
    onSubmit: async ({ value }) => {
      // oxlint-disable-next-line prefer-ternary
      if (isEdit) {
        await updateTicket.mutateAsync({
          data: {
            category: value.category as "bug" | "feature",
            comment: value.comment || undefined,
            processDate: value.processDate,
            projectId: value.projectId,
            ticketUrl: value.ticketUrl,
            totalEffort: value.totalEffort > 0 ? value.totalEffort : null,
            ...(isAdmin && value.employeeId
              ? { employeeId: value.employeeId }
              : {}),
          },
          id: currentRow.id,
        });
      } else {
        await createTicket.mutateAsync({
          category: value.category as "bug" | "feature",
          comment: value.comment || undefined,
          ...(isAdmin && value.employeeId
            ? { employeeId: value.employeeId }
            : {}),
          processDate: value.processDate,
          projectId: value.projectId,
          ticketUrl: value.ticketUrl,
          totalEffort: value.totalEffort > 0 ? value.totalEffort : null,
        });
      }
      onOpenChange(false);
      form.reset();
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        category: (currentRow?.category ?? "") as "" | "bug" | "feature",
        comment: currentRow?.comment ?? "",
        employeeId: currentRow?.employeeId ?? "",
        processDate:
          currentRow?.processDate ?? new Date().toISOString().split("T")[0]!,
        projectId: currentRow?.projectId ?? "",
        ticketUrl: currentRow?.ticketUrl ?? "",
        totalEffort: currentRow?.totalEffort ?? 16,
      });
    }
  }, [open, currentRow, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Ticket" : "New Entry"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* Developer + Project */}
          <div className={isAdmin ? "grid grid-cols-2 gap-4" : ""}>
            {isAdmin && (
              <form.Field name="employeeId">
                {(field) => (
                  <div className="space-y-1">
                    <Label>Developer *</Label>
                    <Select
                      items={developers.map((d) => ({
                        label: d.fullName,
                        value: d.id,
                      }))}
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v ?? "")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select developer" />
                      </SelectTrigger>
                      <SelectContent>
                        {developers.map((dev) => (
                          <SelectItem key={dev.id} value={dev.id}>
                            {dev.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>
            )}
            <form.Field name="projectId">
              {(field) => (
                <div className="space-y-1">
                  <Label>Project *</Label>
                  <Select
                    items={projects.map((p) => ({
                      label: p.name,
                      value: p.id,
                    }))}
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v ?? "")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((proj) => (
                        <SelectItem key={proj.id} value={proj.id}>
                          {proj.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          {/* Category */}
          <form.Field name="category">
            {(field) => (
              <div className="space-y-1">
                <Label>Category *</Label>
                <Select
                  items={[
                    { label: "Bug", value: "bug" },
                    { label: "Feature", value: "feature" },
                  ]}
                  value={field.state.value}
                  onValueChange={(v) =>
                    field.handleChange((v ?? "") as "bug" | "feature")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="-- Select --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          {/* Ticket URL */}
          <form.Field name="ticketUrl">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="ticketUrl">Ticket URL *</Label>
                <Input
                  id="ticketUrl"
                  placeholder="https://..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                />
              </div>
            )}
          </form.Field>

          {/* Process Date + Total Effort */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="processDate">
              {(field) => (
                <div className="space-y-1">
                  <Label htmlFor="processDate">Process date</Label>
                  <Input
                    id="processDate"
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="totalEffort">
              {(field) => (
                <div className="space-y-1">
                  <Label htmlFor="totalEffort">Total effort (hours)</Label>
                  <Input
                    id="totalEffort"
                    type="number"
                    step="0.5"
                    min="0"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                </div>
              )}
            </form.Field>
          </div>

          {/* Comment */}
          <form.Field name="comment">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="comment">Comment</Label>
                <Input
                  id="comment"
                  placeholder="Note (optional)"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save"
                  : "Create ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
