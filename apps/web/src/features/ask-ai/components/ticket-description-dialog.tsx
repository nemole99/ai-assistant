import { useForm } from "@tanstack/react-form";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { TicketIcon } from "lucide-react";

const TICKET_PROMPT_TEMPLATE = (description: string) =>
  `Generate a Jira ticket description for the following task. Format your response as a markdown table with exactly these rows in order: Background, Purpose, Process (including request items), Considerable factors, Resulting Image. If a section has no content, write "N/A".

Task description: ${description}`;

type TicketDescriptionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (displayText: string, fullPrompt: string) => void;
};

export function TicketDescriptionDialog({
  open,
  onOpenChange,
  onGenerate,
}: TicketDescriptionDialogProps) {
  const form = useForm({
    defaultValues: { description: "" },
    onSubmit: ({ value }) => {
      const raw = value.description.trim();
      onGenerate(raw, TICKET_PROMPT_TEMPLATE(raw));
      onOpenChange(false);
      form.reset();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TicketIcon className="size-4" />
            Generate Ticket Description
          </DialogTitle>
          <DialogDescription>
            Describe your task in plain language. AI will generate a structured Jira ticket
            description.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field
              name="description"
              validators={{
                onSubmit: ({ value }) => (!value.trim() ? "Description is required." : undefined),
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel>Task description</FieldLabel>
                  <Textarea
                    id={field.name}
                    rows={5}
                    placeholder="e.g. Fix login timeout bug on mobile when session expires after 30 minutes of inactivity"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <FieldError>{field.state.meta.errors.join(", ")}</FieldError>
                </Field>
              )}
            </form.Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Generate</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
