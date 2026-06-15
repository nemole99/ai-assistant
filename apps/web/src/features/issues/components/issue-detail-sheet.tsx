import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Textarea } from "@workspace/ui/components/textarea";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Loader } from "@/components/loader";
import { SelectDropdown } from "@/components/select-dropdown";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

import { priorityConfig, statusConfig, typeConfig } from "../lib/issue-config";

interface IssueDetailSheetProps {
  issueId: string | null;
  onClose: () => void;
}

export function IssueDetailSheet({ issueId, onClose }: IssueDetailSheetProps) {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const role = session?.user?.role;
  const isManager = role === "ADMIN" || role === "MANAGER";

  const { data: detail, isLoading } = useQuery({
    ...orpc.issue.get.queryOptions({ input: { id: issueId ?? "" } }),
    enabled: !!issueId,
  });

  const statusMutation = useMutation(
    orpc.issue.updateStatus.mutationOptions({
      onError: (err) => toast.error(err.message),
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.issue.list.queryOptions());
        if (issueId) {
          queryClient.invalidateQueries(
            orpc.issue.get.queryOptions({ input: { id: issueId } })
          );
        }
        toast.success("Status updated.");
      },
    })
  );

  const commentMutation = useMutation(
    orpc.issue.addComment.mutationOptions({
      onError: (err) => toast.error(err.message),
      onSuccess: () => {
        if (issueId) {
          queryClient.invalidateQueries(
            orpc.issue.get.queryOptions({ input: { id: issueId } })
          );
        }
        form.reset();
        toast.success("Comment added.");
      },
    })
  );

  const form = useForm({
    defaultValues: { content: "" },
    onSubmit: ({ value }) => {
      if (!issueId) {
        return;
      }
      commentMutation.mutate({ content: value.content, issueId });
    },
    validators: {
      onSubmit: z.object({ content: z.string().min(1) }),
    },
  });

  return (
    <Sheet open={!!issueId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        {isLoading || !detail ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader />
          </div>
        ) : (
          <>
            <SheetHeader className="px-6 pt-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant={typeConfig[detail.type].variant}>
                  {typeConfig[detail.type].label}
                </Badge>
                <Badge variant={priorityConfig[detail.priority].variant}>
                  {priorityConfig[detail.priority].label}
                </Badge>
                <Badge variant={statusConfig[detail.status].variant}>
                  {statusConfig[detail.status].label}
                </Badge>
              </div>
              <SheetTitle className="mt-2 text-left">{detail.title}</SheetTitle>
              <p className="text-muted-foreground text-sm">
                Reported by {detail.reporterName} ·{" "}
                {new Date(detail.createdAt).toLocaleDateString()}
              </p>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-6 py-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {detail.description}
              </p>

              {isManager && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Change Status</p>
                    <SelectDropdown
                      defaultValue={detail.status}
                      items={[
                        { label: "Open", value: "open" },
                        { label: "In Progress", value: "in_progress" },
                        { label: "Resolved", value: "resolved" },
                      ]}
                      placeholder="Select status"
                      onValueChange={(val) =>
                        statusMutation.mutate({
                          id: detail.id,
                          status: val as "open" | "in_progress" | "resolved",
                        })
                      }
                    />
                  </div>
                </>
              )}

              <Separator />

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <p className="text-sm font-medium">
                    Comments ({detail.comments.length})
                  </p>
                </div>

                {detail.comments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No comments yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {detail.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-muted rounded-md p-3 text-sm"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium">
                            {comment.authorName}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {isManager && (
                  <form
                    className="flex flex-col gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      form.handleSubmit();
                    }}
                  >
                    <form.Field name="content">
                      {(field) => (
                        <Textarea
                          className="resize-none"
                          placeholder="Add a comment..."
                          rows={3}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      )}
                    </form.Field>
                    <Button
                      className="self-end"
                      disabled={commentMutation.isPending}
                      size="sm"
                      type="submit"
                    >
                      {commentMutation.isPending
                        ? "Posting..."
                        : "Post Comment"}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
