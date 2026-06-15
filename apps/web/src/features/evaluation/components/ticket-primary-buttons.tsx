import { Button } from "@workspace/ui/components/button";
import { Plus } from "lucide-react";

import { useTicketsContext } from "./ticket-context";

export function TicketPrimaryButtons() {
  const { setOpen } = useTicketsContext();
  return (
    <div className="flex gap-2">
      <Button className="space-x-1" onClick={() => setOpen("add")}>
        <Plus size={18} />
        <span>Add Ticket</span>
      </Button>
    </div>
  );
}
