import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerEyeDropper,
  ColorPickerHueSlider,
  ColorPickerInput,
  ColorPickerSwatch,
  ColorPickerTrigger,
} from "@workspace/ui/components/color-picker";
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

import { orpc } from "@/lib/orpc";

import type { DocumentCategory } from "../data/schema";

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#0f172a",
];

const formSchema = z.object({
  color: z.string().min(1, "Color is required"),
  description: z.string(),
  name: z.string().min(1, "Name is required"),
});

interface Props {
  currentRow?: DocumentCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentCategoryActionDialog({
  currentRow,
  open,
  onOpenChange,
}: Props) {
  const isEdit = !!currentRow;
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    orpc.documentCategory.create.mutationOptions({
      onError: (err) => toast.error(err.message),
      onSuccess: () => {
        queryClient.invalidateQueries(
          orpc.documentCategory.list.queryOptions()
        );
        toast.success("Category created.");
        form.reset();
        onOpenChange(false);
      },
    })
  );

  const updateMutation = useMutation(
    orpc.documentCategory.update.mutationOptions({
      onError: (err) => toast.error(err.message),
      onSuccess: () => {
        queryClient.invalidateQueries(
          orpc.documentCategory.list.queryOptions()
        );
        toast.success("Category updated.");
        onOpenChange(false);
      },
    })
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm({
    defaultValues: isEdit
      ? {
          color: currentRow.color,
          description: currentRow.description ?? "",
          name: currentRow.name,
        }
      : { color: PRESET_COLORS[0]!, description: "", name: "" },
    onSubmit: ({ value }) => {
      if (isEdit) {
        updateMutation.mutate({
          id: currentRow.id,
          ...value,
          description: value.description || undefined,
        });
      } else {
        createMutation.mutate({
          ...value,
          description: value.description || undefined,
        });
      }
    },
    validators: { onSubmit: formSchema },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(s) => {
        form.reset();
        onOpenChange(s);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-start">
          <DialogTitle>{isEdit ? "Edit Category" : "New Category"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the document category."
              : "Create a new document category."}
          </DialogDescription>
        </DialogHeader>
        <form
          id="category-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field
              name="name"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="e.g., Company Policy"
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
              name="color"
              children={(field) => (
                <Field>
                  <FieldLabel>Color</FieldLabel>
                  <ColorPicker
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <ColorPickerTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                        />
                      }
                    >
                      <ColorPickerSwatch className="size-4 rounded-sm" />
                      <span className="font-mono text-sm">
                        {field.state.value}
                      </span>
                    </ColorPickerTrigger>
                    <ColorPickerContent>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className="size-6 rounded-full border-2 transition-all"
                            style={{
                              backgroundColor: c,
                              borderColor:
                                field.state.value === c
                                  ? "white"
                                  : "transparent",
                              outline:
                                field.state.value === c
                                  ? `2px solid ${c}`
                                  : "none",
                            }}
                            onClick={() => field.handleChange(c)}
                          />
                        ))}
                      </div>
                      <ColorPickerArea />
                      <ColorPickerHueSlider />
                      <div className="flex items-center gap-2">
                        <ColorPickerSwatch />
                        <ColorPickerInput className="flex-1" />
                        <ColorPickerEyeDropper />
                      </div>
                    </ColorPickerContent>
                  </ColorPicker>
                </Field>
              )}
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
                    placeholder="What kind of documents belong here?"
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
          <Button type="submit" form="category-form" disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
