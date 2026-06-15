import type { Row } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Ellipsis, Pencil, Trash2 } from "lucide-react";

import type { EvaluationTicket } from "../data/schema";
import { useTicketsContext } from "./ticket-context";

interface DataTableRowActionsProps {
  row: Row<EvaluationTicket>;
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { setOpen, setCurrentRow } = useTicketsContext();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
          />
        }
      >
        <Ellipsis className="h-4 w-4" />
        <span className="sr-only">Open menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row.original);
            setOpen("edit");
          }}
        >
          Edit
          <DropdownMenuShortcut>
            <Pencil size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row.original);
            setOpen("delete");
          }}
          className="text-red-500!"
        >
          Delete
          <DropdownMenuShortcut>
            <Trash2 size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
