import { format } from "date-fns";
import { AlertCircle, FileText, MoreHorizontal, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { LongText } from "@/components/long-text";
import { type Document } from "../data/schema";
import { DocumentCategoryBadge } from "./document-category-badge";
import { DocumentStatusBadge } from "./document-status-badge";
import { useDocuments } from "./documents-provider";

export function DocumentsTable({ data }: { data: Document[] }) {
  const { setOpen, setCurrentRow } = useDocuments();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>File</TableHead>
          <TableHead>Uploaded</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="max-w-64 font-medium">
              <div className="flex items-center gap-2">
                <LongText className="max-w-48">{doc.title}</LongText>
                {(doc.status === "FAILED" || doc.status === "INGEST_FAILED") &&
                  doc.errorMessage && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <AlertCircle
                            className="text-destructive size-4 shrink-0"
                            aria-label="Processing error"
                          />
                        }
                      />
                      <TooltipContent className="max-w-64">{doc.errorMessage}</TooltipContent>
                    </Tooltip>
                  )}
              </div>
            </TableCell>
            <TableCell>
              <DocumentCategoryBadge category={doc.category} />
            </TableCell>
            <TableCell>
              <DocumentStatusBadge status={doc.status} />
            </TableCell>
            <TableCell className="text-muted-foreground max-w-48 text-sm">
              <LongText className="max-w-44">{doc.originalFilename}</LongText>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {format(new Date(doc.createdAt), "dd MMM yyyy")}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon" className="size-8" />}
                >
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Actions</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setCurrentRow(doc);
                      setOpen("edit");
                    }}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  {(doc.status === "FAILED" || doc.status === "INGEST_FAILED") && (
                    <DropdownMenuItem
                      onClick={() => {
                        setCurrentRow(doc);
                        setOpen("retry");
                      }}
                    >
                      <RefreshCw className="mr-2 size-4" />
                      Retry
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setCurrentRow(doc);
                      setOpen("delete");
                    }}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
