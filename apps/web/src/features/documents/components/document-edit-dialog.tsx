import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { toast } from "sonner";
import { z } from "zod";

import { SelectDropdown } from "@/components/select-dropdown";
import { orpc } from "@/lib/orpc";

import type { Document } from "../data/schema";

const formSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  description: z.string(),
  title: z.string().min(1, "Title is required"),
});

interface Props {
  document: Document;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentEditDialog({ document, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    ...orpc.documentCategory.list.queryOptions(),
    enabled: open,
  });

  const updateMutation = useMutation(
    orpc.document.update.mutationOptions({
      onError: (err) => toast.error(err.message),
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.document.list.queryOptions());
        toast.success("Document updated.");
        onOpenChange(false);
      },
    })
  );

  const form = useForm({
    defaultValues: {
      categoryId: document.categoryId,
      description: document.description ?? "",
      title: document.title,
    },
    onSubmit: ({ value }) => {
      updateMutation.mutate({
        categoryId: value.categoryId,
        description: value.description || undefined,
        id: document.id,
        title: value.title,
      });
    },
    validators: { onSubmit: formSchema },
  });

  const categoryOptions = categories.map((c) => ({
    label: c.name,
    value: c.id,
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={(s) => {
        form.reset();
        onOpenChange(s);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-start">
          <DialogTitle>Edit Document</DialogTitle>
          <DialogDescription>
            Update the document metadata. The file cannot be changed.
          </DialogDescription>
        </DialogHeader>
        <form
          id="edit-doc-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field
              name="title"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      autoComplete="off"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
            <form.Field
              name="categoryId"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel>Category</FieldLabel>
                    <SelectDropdown
                      defaultValue={field.state.value}
                      onValueChange={(val) => field.handleChange(val)}
                      placeholder="Select a category"
                      items={categoryOptions}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            />
            <form.Field
              name="description"
              children={(field) => (
                <Field>
                  <FieldLabel>
                    Description{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </FieldLabel>
                  <Textarea
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-doc-form"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
