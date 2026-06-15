import { ConfirmDialog } from "@/components/confirm-dialog";

import { useDeleteTicket } from "../hooks/use-tickets";
import { useTicketsContext } from "./ticket-context";
import { TicketFormDialog } from "./ticket-form-dialog";

export function TicketDialogs() {
  const { open, setOpen, currentRow, setCurrentRow } = useTicketsContext();
  const deleteTicket = useDeleteTicket();

  const closeAndClear = (type: "add" | "edit" | "delete") => {
    setOpen(type);
    setTimeout(() => setCurrentRow(null), 500);
  };

  return (
    <>
      <TicketFormDialog
        key="ticket-add"
        open={open === "add"}
        onOpenChange={() => setOpen("add")}
      />

      {currentRow && (
        <ConfirmDialog
          key={`ticket-delete-${currentRow.id}`}
          open={open === "delete"}
          onOpenChange={() => closeAndClear("delete")}
          title="Delete Ticket"
          desc="Are you sure you want to delete this ticket? This action cannot be undone."
          handleConfirm={async () => {
            await deleteTicket.mutateAsync({ id: currentRow.id });
            closeAndClear("delete");
          }}
          isLoading={deleteTicket.isPending}
          destructive
        />
      )}
    </>
  );
}
