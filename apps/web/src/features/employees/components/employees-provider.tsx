import React, { useState } from "react";
import useDialogState from "@/hooks/use-dialog-state";
import { type Employee } from "../data/schema";

type EmployeesDialogType = "add" | "edit" | "delete";

type EmployeesContextType = {
  open: EmployeesDialogType | null;
  setOpen: (str: EmployeesDialogType | null) => void;
  currentRow: Employee | null;
  setCurrentRow: React.Dispatch<React.SetStateAction<Employee | null>>;
};

const EmployeesContext = React.createContext<EmployeesContextType | null>(null);

export function EmployeesProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useDialogState<EmployeesDialogType>(null);
  const [currentRow, setCurrentRow] = useState<Employee | null>(null);

  return (
    <EmployeesContext value={{ open, setOpen, currentRow, setCurrentRow }}>
      {children}
    </EmployeesContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useEmployees = () => {
  const ctx = React.useContext(EmployeesContext);
  if (!ctx) {
    throw new Error("useEmployees has to be used within <EmployeesProvider>");
  }
  return ctx;
};
