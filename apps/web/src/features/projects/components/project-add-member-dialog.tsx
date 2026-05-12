"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, ChevronsUpDown, Check, X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { cn } from "@workspace/ui/lib/utils";
import { orpc } from "@/lib/orpc";
import { type ProjectMember } from "../data/schema";

type AddMemberDialogProps = {
  projectId: string;
  existingMembers: ProjectMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProjectAddMemberDialog({
  projectId,
  existingMembers,
  open,
  onOpenChange,
}: AddMemberDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery(orpc.employee.list.queryOptions());

  const existingIds = new Set(existingMembers.map((m) => m.id));
  const availableEmployees = employees.filter(
    (e) => !existingIds.has(e.id) && e.status === "ACTIVE",
  );

  const addMutation = useMutation(orpc.project.addMember.mutationOptions());

  const handleAdd = async () => {
    if (!selectedIds.length) return;
    try {
      await Promise.all(
        selectedIds.map((employeeId) => addMutation.mutateAsync({ projectId, employeeId })),
      );
      await Promise.all([
        queryClient.invalidateQueries(
          orpc.project.listMembers.queryOptions({ input: { projectId } }),
        ),
        queryClient.invalidateQueries(orpc.project.list.queryOptions()),
        queryClient.invalidateQueries(orpc.project.get.queryOptions({ input: { id: projectId } })),
      ]);
      toast.success(
        selectedIds.length === 1
          ? "Member added successfully."
          : `${selectedIds.length} members added successfully.`,
      );
      setSelectedIds([]);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add members.");
    }
  };

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectedEmployees = availableEmployees.filter((e) => selectedIds.includes(e.id));

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        setSelectedIds([]);
        setPopoverOpen(false);
        onOpenChange(state);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-start">
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Add Members
          </DialogTitle>
          <DialogDescription>
            Select one or more employees to add to this project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                />
              }
            >
              <span className="text-muted-foreground">
                {selectedIds.length === 0
                  ? "Select employees..."
                  : `${selectedIds.length} selected`}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
              <Command>
                <CommandInput placeholder="Search employee..." />
                <CommandList>
                  <CommandEmpty>No employees found.</CommandEmpty>
                  <CommandGroup>
                    {availableEmployees.map((e) => (
                      <CommandItem
                        key={e.id}
                        value={`${e.fullName} ${e.position}`}
                        onSelect={() => toggle(e.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            selectedIds.includes(e.id) ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div>
                          <p className="text-sm font-medium">{e.fullName}</p>
                          <p className="text-muted-foreground text-xs">{e.position}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedEmployees.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedEmployees.map((e) => (
                <Badge key={e.id} variant="secondary" className="gap-1">
                  {e.fullName}
                  <button
                    type="button"
                    onClick={() => toggle(e.id)}
                    className="hover:text-destructive ml-0.5 transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedIds.length || addMutation.isPending}>
            {addMutation.isPending
              ? "Adding..."
              : `Add ${selectedIds.length > 0 ? selectedIds.length : ""} Member${selectedIds.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
