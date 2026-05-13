import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { orpc } from "@/lib/orpc";
import { DocumentEditDialog } from "./document-edit-dialog";
import { DocumentUploadDialog } from "./document-upload-dialog";
import { useDocuments } from "./documents-provider";

export function DocumentsDialogs() {
  const { open, setOpen, currentRow } = useDocuments();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    orpc.document.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.document.list.queryOptions());
        toast.success("Document deleted.");
        setOpen(null);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const retryMutation = useMutation(
    orpc.document.retry.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.document.list.queryOptions());
        toast.success("Document queued for reprocessing.");
        setOpen(null);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  return (
    <>
      <DocumentUploadDialog
        open={open === "upload"}
        onOpenChange={(s) => !s && setOpen(null)}
      />

      {currentRow && (
        <>
          <DocumentEditDialog
            document={currentRow}
            open={open === "edit"}
            onOpenChange={(s) => !s && setOpen(null)}
          />

          <ConfirmDialog
            open={open === "delete"}
            onOpenChange={(s) => !s && setOpen(null)}
            title="Delete document?"
            desc={`This will permanently delete "${currentRow.title}" and remove its file from storage. This action cannot be undone.`}
            confirmText="Delete"
            destructive
            isLoading={deleteMutation.isPending}
            handleConfirm={() => deleteMutation.mutate({ id: currentRow.id })}
          />

          <ConfirmDialog
            open={open === "retry"}
            onOpenChange={(s) => !s && setOpen(null)}
            title="Retry document processing?"
            desc={`Re-queue "${currentRow.title}" for PDF → Markdown conversion.`}
            confirmText="Retry"
            isLoading={retryMutation.isPending}
            handleConfirm={() => retryMutation.mutate({ id: currentRow.id })}
          />
        </>
      )}
    </>
  );
}
