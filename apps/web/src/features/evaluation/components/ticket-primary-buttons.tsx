import { Button } from "@workspace/ui/components/button";
import { Plus, RefreshCw, Upload } from "lucide-react";

import { useTicketsContext } from "./ticket-context";

export function TicketPrimaryButtons() {
  const { setOpen } = useTicketsContext();

  return (
    <div className="flex gap-2">
      <Button
        data-tour="import-btn"
        variant="outline"
        className="space-x-1"
        onClick={() => setOpen("import")}
      >
        <Upload size={18} />
        <span>Import</span>
      </Button>
      <Button
        data-tour="sync-jira-btn"
        variant="outline"
        className="space-x-1"
        onClick={() => setOpen("sync")}
      >
        <RefreshCw size={18} />
        <span>Sync Jira</span>
      </Button>
      <Button
        data-tour="add-ticket-btn"
        className="space-x-1"
        onClick={() => setOpen("add")}
      >
        <Plus size={18} />
        <span>Add Ticket</span>
      </Button>
    </div>
  );
}
