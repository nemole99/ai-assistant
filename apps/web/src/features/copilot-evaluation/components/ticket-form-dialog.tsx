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

import {
  useCreateTicket,
  useTicketDevelopers,
  useTicketProjects,
} from "../hooks/use-tickets";

interface TicketFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketFormDialog({
  open,
  onOpenChange,
}: TicketFormDialogProps) {
  const createTicket = useCreateTicket();
  const { data: developers = [] } = useTicketDevelopers();
  const { data: projects = [] } = useTicketProjects();

  const form = useForm({
    defaultValues: {
      category: "" as "" | "bug" | "feature",
      codeFixActual: 0,
      codeReviewActual: 0,
      comment: "",
      developer: "",
      investigateActual: 0,
      processDate: new Date().toISOString().split("T")[0],
      project: "",
      reopenStatus: 0,
      ticketUrl: "",
      totalEffort: 16,
    },
    onSubmit: async ({ value }) => {
      const data = {
        ...value,
        category: value.category as "bug" | "feature",
        codeFixEstimate: value.totalEffort * 0.4,
        codeReviewEstimate: value.totalEffort * 0.15,
        investigateEstimate: value.totalEffort * 0.2,
      };
      await createTicket.mutateAsync(data);
      onOpenChange(false);
      form.reset();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nhập dữ liệu mới</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {/* Row 1: Developer + Project */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="developer">
              {(field) => (
                <div className="space-y-1">
                  <Label>Developer *</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tên developer" />
                    </SelectTrigger>
                    <SelectContent>
                      {developers.map((dev) => (
                        <SelectItem key={dev} value={dev}>
                          {dev}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field name="project">
              {(field) => (
                <div className="space-y-1">
                  <Label>Project *</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tên project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((proj) => (
                        <SelectItem key={proj} value={proj}>
                          {proj}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          {/* Row 2: Category + Ticket URL */}
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="category">
              {(field) => (
                <div className="space-y-1">
                  <Label>Category *</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) =>
                      field.handleChange(v as "bug" | "feature")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="-- Chọn --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

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
          </div>

          {/* Process Date */}
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

          {/* Total Effort */}
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
                  required
                />
              </div>
            )}
          </form.Field>

          {/* INVESTIGATE Section */}
          <div>
            <h4 className="text-sm font-bold text-teal-700 dark:text-teal-400 uppercase mb-2">
              Investigate
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="totalEffort">
                {(field) => (
                  <div className="space-y-1">
                    <Label>Estimation 20%</Label>
                    <Input
                      type="number"
                      value={(field.state.value * 0.2).toFixed(2)}
                      readOnly
                      tabIndex={-1}
                      className="bg-muted"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="investigateActual">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor="investigateActual">Actual</Label>
                    <Input
                      id="investigateActual"
                      type="number"
                      step="0.5"
                      min="0"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </div>

          {/* CODE / FIXING Section */}
          <div>
            <h4 className="text-sm font-bold text-teal-700 dark:text-teal-400 uppercase mb-2">
              Code / Fixing
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="totalEffort">
                {(field) => (
                  <div className="space-y-1">
                    <Label>Estimate 40%</Label>
                    <Input
                      type="number"
                      value={(field.state.value * 0.4).toFixed(2)}
                      readOnly
                      tabIndex={-1}
                      className="bg-muted"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="codeFixActual">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor="codeFixActual">Actual</Label>
                    <Input
                      id="codeFixActual"
                      type="number"
                      step="0.5"
                      min="0"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </div>

          {/* CODE REVIEW Section */}
          <div>
            <h4 className="text-sm font-bold text-teal-700 dark:text-teal-400 uppercase mb-2">
              Code Review
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="totalEffort">
                {(field) => (
                  <div className="space-y-1">
                    <Label>Estimate 15%</Label>
                    <Input
                      type="number"
                      value={(field.state.value * 0.15).toFixed(2)}
                      readOnly
                      tabIndex={-1}
                      className="bg-muted"
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="codeReviewActual">
                {(field) => (
                  <div className="space-y-1">
                    <Label htmlFor="codeReviewActual">Actual</Label>
                    <Input
                      id="codeReviewActual"
                      type="number"
                      step="0.5"
                      min="0"
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(Number(e.target.value))
                      }
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </div>

          {/* Re-open status */}
          <form.Field name="reopenStatus">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="reopenStatus">Re-open status</Label>
                <Input
                  id="reopenStatus"
                  type="number"
                  min="0"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              </div>
            )}
          </form.Field>

          {/* Comment */}
          <form.Field name="comment">
            {(field) => (
              <div className="space-y-1">
                <Label htmlFor="comment">Comment</Label>
                <Input
                  id="comment"
                  placeholder="Ghi chú (tuỳ chọn)"
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
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? "Đang tạo..." : "Tạo ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
