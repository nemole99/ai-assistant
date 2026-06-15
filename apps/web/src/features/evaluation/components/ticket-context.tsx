import React, { useState } from "react";

import useDialogState from "@/hooks/use-dialog-state";

import type { EvaluationTicket } from "../data/schema";

type TicketDialogType = "add" | "edit" | "delete";

interface TicketsContextType {
  open: TicketDialogType | null;
  setOpen: (str: TicketDialogType | null) => void;
  currentRow: EvaluationTicket | null;
  setCurrentRow: React.Dispatch<React.SetStateAction<EvaluationTicket | null>>;
}

const TicketsContext = React.createContext<TicketsContextType | null>(null);

export function TicketsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<TicketDialogType>(null);
  const [currentRow, setCurrentRow] = useState<EvaluationTicket | null>(null);

  return (
    <TicketsContext value={{ currentRow, open, setCurrentRow, setOpen }}>
      {children}
    </TicketsContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTicketsContext = () => {
  const ctx = React.useContext(TicketsContext);
  if (!ctx) {
    throw new Error(
      "useTicketsContext has to be used within <TicketsProvider>"
    );
  }
  return ctx;
};
