import React, { useState } from "react";
import useDialogState from "@/hooks/use-dialog-state";
import { type Document } from "../data/schema";

type DocumentsDialogType = "upload" | "edit" | "delete" | "retry";

type DocumentsContextType = {
  open: DocumentsDialogType | null;
  setOpen: (str: DocumentsDialogType | null) => void;
  currentRow: Document | null;
  setCurrentRow: React.Dispatch<React.SetStateAction<Document | null>>;
};

const DocumentsContext = React.createContext<DocumentsContextType | null>(null);

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<DocumentsDialogType>(null);
  const [currentRow, setCurrentRow] = useState<Document | null>(null);

  return (
    <DocumentsContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </DocumentsContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useDocuments = () => {
  const ctx = React.useContext(DocumentsContext);
  if (!ctx) {
    throw new Error("useDocuments has to be used within <DocumentsProvider>");
  }
  return ctx;
};
