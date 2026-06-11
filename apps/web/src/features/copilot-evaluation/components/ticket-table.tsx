import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { MoreHorizontal, Pencil, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";

import type { CopilotTicket } from "../data/schema";
import { useDeleteTicket } from "../hooks/use-tickets";

interface TicketTableProps {
  tickets: CopilotTicket[];
  onEdit: (ticket: CopilotTicket) => void;
}

function calcEfficiency(estimate: number, actual: number) {
  if (estimate === 0) {
    return 0;
  }
  return ((estimate - actual) / estimate) * 100;
}

export function TicketTable({ tickets, onEdit }: TicketTableProps) {
  const deleteTicket = useDeleteTicket();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead>Developer</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Ticket</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Total (h)</TableHead>
            <TableHead className="text-right">Investigate Eff%</TableHead>
            <TableHead className="text-right">Code Eff%</TableHead>
            <TableHead className="text-right">Review Eff%</TableHead>
            <TableHead>Reopen</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={11}
                className="text-center text-muted-foreground py-8"
              >
                No tickets found
              </TableCell>
            </TableRow>
          ) : (
            tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">
                  {ticket.developer}
                </TableCell>
                <TableCell>{ticket.project}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      ticket.category === "bug" ? "destructive" : "default"
                    }
                  >
                    {ticket.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <a
                    href={ticket.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    {ticket.ticketUrl.split("/").pop() || "Link"}
                  </a>
                </TableCell>
                <TableCell>{ticket.processDate}</TableCell>
                <TableCell className="text-right">
                  {ticket.totalEffort}
                </TableCell>
                <TableCell className="text-right">
                  {calcEfficiency(
                    ticket.investigateEstimate,
                    ticket.investigateActual
                  ).toFixed(1)}
                  %
                </TableCell>
                <TableCell className="text-right">
                  {calcEfficiency(
                    ticket.codeFixEstimate,
                    ticket.codeFixActual
                  ).toFixed(1)}
                  %
                </TableCell>
                <TableCell className="text-right">
                  {calcEfficiency(
                    ticket.codeReviewEstimate,
                    ticket.codeReviewActual
                  ).toFixed(1)}
                  %
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      ticket.reopenStatus === 1 ? "destructive" : "secondary"
                    }
                  >
                    {ticket.reopenStatus === 1 ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(ticket)}>
                        <Pencil className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(ticket.id)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Ticket"
        desc="Are you sure you want to delete this ticket? This action cannot be undone."
        handleConfirm={async () => {
          if (deleteId) {
            await deleteTicket.mutateAsync({ id: deleteId });
            setDeleteId(null);
          }
        }}
        isLoading={deleteTicket.isPending}
        destructive
      />
    </>
  );
}
