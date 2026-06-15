import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Plus, Tag, FileText } from "lucide-react";

import { ContentLayout } from "@/components/layout/content-layout";
import { Loader } from "@/components/loader";
import { orpc } from "@/lib/orpc";

import { DocumentsDialogs } from "./components/documents-dialogs";
import { DocumentsEmptyState } from "./components/documents-empty-state";
import {
  DocumentsProvider,
  useDocuments,
} from "./components/documents-provider";
import { DocumentsTable } from "./components/documents-table";

function AdminDocumentsInner() {
  const { setOpen } = useDocuments();
  const { data: documents = [], isLoading } = useQuery({
    ...orpc.document.list.queryOptions(),
    refetchInterval: (query) => {
      const hasProcessing = query.state.data?.some(
        (doc) => doc.status === "PENDING" || doc.status === "INGESTING"
      );
      return hasProcessing ? 5000 : false;
    },
  });
  const location = useLocation();
  const isCategories = location.pathname.includes("/categories");

  return (
    <ContentLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
            <p className="text-muted-foreground">
              Upload and manage company documents.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setOpen("upload")}>
              <Plus className="mr-2 size-4" />
              Upload Document
            </Button>
          </div>
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

        {isLoading && <Loader />}
        {!isLoading && documents.length === 0 && (
          <DocumentsEmptyState
            icon={<FileText />}
            title="No documents yet"
            description="Upload a document to get started."
            action={
              <Button size="sm" onClick={() => setOpen("upload")}>
                <Plus className="mr-2 size-4" />
                Upload Document
              </Button>
            }
          />
        )}
        {!isLoading && documents.length > 0 && (
          <DocumentsTable data={documents} />
        )}

        <DocumentsDialogs />
      </div>
    </ContentLayout>
  );
}

export function AdminDocuments() {
  return (
    <DocumentsProvider>
      <AdminDocumentsInner />
    </DocumentsProvider>
  );
}
