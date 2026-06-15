import { Button } from "@workspace/ui/components/button";
import { Download, Plus, Upload } from "lucide-react";
import { toast } from "sonner";

import { useExportTickets } from "../hooks/use-tickets";
import { exportTicketsToExcel } from "../lib/ticket-excel";
import { useTicketsContext } from "./ticket-context";

interface TicketPrimaryButtonsProps {
  month: string;
}

export function TicketPrimaryButtons({ month }: TicketPrimaryButtonsProps) {
  const { setOpen } = useTicketsContext();
  const exportTickets = useExportTickets();

  const handleExport = async () => {
    const data = await exportTickets.mutateAsync({ month });
    if (data.length === 0) {
      toast.info("No tickets to export for this month.");
      return;
    }
    exportTicketsToExcel(data, month);
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="space-x-1"
        onClick={() => setOpen("import")}
      >
        <Upload size={18} />
        <span>Import</span>
      </Button>
      <Button
        variant="outline"
        className="space-x-1"
        disabled={exportTickets.isPending}
        onClick={handleExport}
      >
        <Download size={18} />
        <span>Export</span>
      </Button>
      <Button className="space-x-1" onClick={() => setOpen("add")}>
        <Plus size={18} />
        <span>Add Ticket</span>
      </Button>
    </div>
  );
}
