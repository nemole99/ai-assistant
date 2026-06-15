import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";

import {
  useImportTickets,
  useTicketDevelopers,
  useTicketProjects,
} from "../hooks/use-tickets";
import { downloadTicketTemplate, parseTicketExcel } from "../lib/ticket-excel";

interface TicketImportDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function TicketImportDialog({
  open,
  onOpenChange,
}: TicketImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const { data: session } = authClient.useSession();
  const { data: developers = [] } = useTicketDevelopers();
  const { data: projects = [] } = useTicketProjects();
  const importTickets = useImportTickets();

  const isEmployee =
    session?.user.role !== "ADMIN" && session?.user.role !== "MANAGER";

  const handleClose = () => {
    setParseErrors([]);
    setFileName("");
    if (fileRef.current) {
      fileRef.current.value = "";
    }
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
    setParseErrors([]);
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      return;
    }

    setParseErrors([]);

    const selfId = isEmployee ? "self" : undefined;

    const { tickets, errors } = await parseTicketExcel(
      file,
      developers,
      projects,
      selfId
    );

    if (errors.length > 0) {
      setParseErrors(errors.map((e) => e.message));
      return;
    }

    if (tickets.length === 0) {
      setParseErrors(["No valid rows found in the file."]);
      return;
    }

    try {
      await importTickets.mutateAsync({ tickets });
      handleClose();
    } catch {
      // error toast already shown by the mutation's onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Tickets</DialogTitle>
          <DialogDescription>
            Upload an Excel (.xlsx) file to bulk-import tickets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={downloadTicketTemplate}
          >
            <Download size={16} className="mr-2" />
            Download Template
          </Button>

          <button
            type="button"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed p-6 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={20} />
            {fileName ? (
              <span className="font-medium text-foreground">{fileName}</span>
            ) : (
              <span>Click to select a .xlsx file</span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={handleFileChange}
            />
          </button>

          {parseErrors.length > 0 && (
            <ul className="space-y-1 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              {parseErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            disabled={!fileName || importTickets.isPending}
            onClick={handleImport}
          >
            {importTickets.isPending ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
