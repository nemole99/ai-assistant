import { useState } from "react";
import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UploadCloud, X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "@workspace/ui/components/file-upload";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { SelectDropdown } from "@/components/select-dropdown";
import { orpc } from "@/lib/orpc";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  categoryId: z.string().min(1, "Category is required"),
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DocumentUploadDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  const { data: categories = [] } = useQuery({
    ...orpc.documentCategory.list.queryOptions(),
    enabled: open,
  });

  const requestUploadMutation = useMutation(orpc.document.requestUpload.mutationOptions());
  const confirmUploadMutation = useMutation(orpc.document.confirmUpload.mutationOptions());

  const form = useForm({
    defaultValues: { title: "", description: "", categoryId: "" },
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      if (!selectedFile) {
        toast.error("Please select a PDF file");
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const { documentId, presignedUrl } = await requestUploadMutation.mutateAsync({
          title: value.title,
          description: value.description || undefined,
          categoryId: value.categoryId,
          filename: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: "application/pdf",
        });

        const xhr = new XMLHttpRequest();
        await new Promise<void>((resolve, reject) => {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed with status ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.open("PUT", presignedUrl);
          xhr.setRequestHeader("Content-Type", "application/pdf");
          xhr.send(selectedFile);
        });

        await confirmUploadMutation.mutateAsync({ documentId });

        queryClient.invalidateQueries(orpc.document.list.queryOptions());
        toast.success("Document uploaded and queued for processing.");
        handleClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
  });

  function handleClose() {
    form.reset();
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
    onOpenChange(false);
  }

  const categoryOptions = categories.map((c) => ({
    label: c.name,
    value: c.id,
  }));

  const isPending =
    requestUploadMutation.isPending || confirmUploadMutation.isPending || isUploading;

  return (
    <Dialog
      open={open}
      onOpenChange={(s) => {
        if (!isPending) handleClose();
        else if (s) onOpenChange(s);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a PDF document to the company knowledge base.
          </DialogDescription>
        </DialogHeader>
        <form
          id="upload-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel>PDF File</FieldLabel>
              <FileUpload
                accept="application/pdf"
                maxFiles={1}
                maxSize={MAX_FILE_SIZE}
                value={selectedFile ? [selectedFile] : []}
                onValueChange={(files) => {
                  const file = files[0] ?? null;
                  setSelectedFile(file);
                  if (file && !form.getFieldValue("title")) {
                    form.setFieldValue("title", file.name.replace(/\.pdf$/i, ""));
                  }
                }}
                onFileReject={(_file, message) => toast.error(message)}
                disabled={isUploading}
              >
                <FileUploadDropzone>
                  <UploadCloud className="text-muted-foreground size-8" />
                  <p className="text-muted-foreground text-sm">
                    Drag & drop or click to upload a PDF (max 10 MB)
                  </p>
                </FileUploadDropzone>
                <FileUploadList>
                  {selectedFile && (
                    <FileUploadItem value={selectedFile}>
                      <FileUploadItemPreview />
                      <FileUploadItemMetadata />
                      <FileUploadItemDelete
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ms-auto size-7 text-muted-foreground hover:text-foreground"
                          />
                        }
                      >
                        <X className="size-4" />
                      </FileUploadItemDelete>
                    </FileUploadItem>
                  )}
                </FileUploadList>
              </FileUpload>
            </Field>

            <form.Field
              name="title"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., Employee Handbook 2026"
                      autoComplete="off"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            />

            <form.Field
              name="categoryId"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Category</FieldLabel>
                    <SelectDropdown
                      defaultValue={field.state.value}
                      onValueChange={(val) => field.handleChange(val)}
                      placeholder="Select a category"
                      items={categoryOptions}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            />

            <form.Field
              name="description"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    Description{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </FieldLabel>
                  <Textarea
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Brief description of this document..."
                    className="resize-none"
                    rows={2}
                  />
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="upload-form" disabled={isPending}>
            {isPending ? (isUploading ? `Uploading ${uploadProgress}%…` : "Processing…") : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
