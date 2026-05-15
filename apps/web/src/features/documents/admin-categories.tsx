import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Tag, FileText } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ContentLayout } from "@/components/layout/content-layout";
import { Loader } from "@/components/loader";
import { orpc } from "@/lib/orpc";
import { DocumentCategoryActionDialog } from "./components/document-category-action-dialog";
import { DocumentsEmptyState } from "./components/documents-empty-state";
import { type DocumentCategory } from "./data/schema";

export function AdminDocumentCategories() {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useQuery(orpc.documentCategory.list.queryOptions());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<DocumentCategory | null>(null);

  const deleteMutation = useMutation(
    orpc.documentCategory.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.documentCategory.list.queryOptions());
        toast.success("Category deleted.");
        setDeleteOpen(false);
        setCurrentRow(null);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  function handleEdit(cat: DocumentCategory) {
    setCurrentRow(cat);
    setDialogOpen(true);
  }

  function handleDelete(cat: DocumentCategory) {
    setCurrentRow(cat);
    setDeleteOpen(true);
  }

  const location = useLocation();
  const isCategories = location.pathname.includes("/categories");

  return (
    <ContentLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
            <p className="text-muted-foreground">Upload and manage company documents.</p>
          </div>
          <Button
            onClick={() => {
              setCurrentRow(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            New Category
          </Button>
        </div>

        <div className="border-b">
          <div className="flex gap-4">
            <Link
              to="/documents"
              className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium ${
                !isCategories
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-4" />
              Documents
            </Link>
            <Link
              to="/documents/categories"
              className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium ${
                isCategories
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Tag className="size-4" />
              Categories
            </Link>
          </div>
        </div>

        {isLoading ? (
          <Loader />
        ) : categories.length === 0 ? (
          <DocumentsEmptyState
            icon={<Tag />}
            title="No categories yet"
            description="Create a category to organise your documents."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setCurrentRow(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" />
                New Category
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 font-medium">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {cat.description ?? "—"}
                  </TableCell>
                  <TableCell>{cat.documentCount}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(cat)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DocumentCategoryActionDialog
          currentRow={currentRow ?? undefined}
          open={dialogOpen}
          onOpenChange={(s) => {
            setDialogOpen(s);
            if (!s) setCurrentRow(null);
          }}
        />

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={(s) => {
            setDeleteOpen(s);
            if (!s) setCurrentRow(null);
          }}
          title="Delete category?"
          desc={
            currentRow
              ? currentRow.documentCount > 0
                ? `Cannot delete "${currentRow.name}" — it has ${currentRow.documentCount} document(s). Move or delete them first.`
                : `Delete "${currentRow.name}"? This action cannot be undone.`
              : ""
          }
          confirmText="Delete"
          destructive
          isLoading={deleteMutation.isPending}
          handleConfirm={() => {
            if (currentRow) deleteMutation.mutate({ id: currentRow.id });
          }}
          disabled={!!currentRow && currentRow.documentCount > 0}
        />
      </div>
    </ContentLayout>
  );
}
