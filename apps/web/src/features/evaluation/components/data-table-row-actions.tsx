import { useQuery } from "@tanstack/react-query";
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

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

import type { EvaluationTicket } from "../data/schema";
import { useTicketsContext } from "./ticket-context";

interface DataTableRowActionsProps {
  row: Row<EvaluationTicket>;
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { setOpen, setCurrentRow } = useTicketsContext();
  const { data: session } = authClient.useSession();
  const role = session?.user?.role;
  const isManagerOrAdmin = role === "ADMIN" || role === "MANAGER";

  const { data: selfEmployee } = useQuery(orpc.employee.getSelf.queryOptions());

  const isOwner = !!selfEmployee && selfEmployee.id === row.original.employeeId;
  const canEdit = isManagerOrAdmin || isOwner;
  const canDelete = isManagerOrAdmin || isOwner;

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
          disabled={!canEdit}
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
          disabled={!canDelete}
          className="text-red-500!"
          onClick={() => {
            setCurrentRow(row.original);
            setOpen("delete");
          }}
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
