import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { ChevronUp, Flag, MessageCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ContentLayout } from "@/components/layout/content-layout";
import { Loader } from "@/components/loader";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

import { IssueDetailSheet } from "./components/issue-detail-sheet";
import { IssueSubmitDialog } from "./components/issue-submit-dialog";
import { priorityConfig, statusConfig, typeConfig } from "./lib/issue-config";

type IssueStatus = "all" | "open" | "in_progress" | "resolved";

export function Issues() {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [tab, setTab] = useState<IssueStatus>("all");
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;
  const isAdmin = session?.user?.role === "ADMIN";

  const { data: issues = [], isLoading } = useQuery(
    orpc.issue.list.queryOptions()
  );

  const toggleUpvoteMutation = useMutation(
    orpc.issue.toggleUpvote.mutationOptions({
      onError: (err) => toast.error(err.message),
      onSuccess: () =>
        queryClient.invalidateQueries(orpc.issue.list.queryOptions()),
    })
  );

  const deleteMutation = useMutation(
    orpc.issue.delete.mutationOptions({
      onError: (err) => toast.error(err.message),
      onSuccess: () => {
        queryClient.invalidateQueries(orpc.issue.list.queryOptions());
        toast.success("Issue deleted.");
      },
    })
  );

  const filtered =
    tab === "all" ? issues : issues.filter((i) => i.status === tab);

  const counts = {
    all: issues.length,
    in_progress: issues.filter((i) => i.status === "in_progress").length,
    open: issues.filter((i) => i.status === "open").length,
    resolved: issues.filter((i) => i.status === "resolved").length,
  };

  return (
    <ContentLayout>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Issues</h2>
          <p className="text-muted-foreground">
            Report bugs and request features for the internal platform.
          </p>
        </div>
        <Button onClick={() => setSubmitOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Report Issue
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as IssueStatus)}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="open">Open ({counts.open})</TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress ({counts.in_progress})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved ({counts.resolved})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading && <Loader />}
          {!isLoading && filtered.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Flag />
                </EmptyMedia>
                <EmptyTitle>No issues found</EmptyTitle>
                <EmptyDescription>
                  {tab === "all"
                    ? "No issues have been reported yet."
                    : `No ${tab.replace("_", " ")} issues.`}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {!isLoading && filtered.length > 0 && (
            <div className="border-border divide-border divide-y border">
              {filtered.map((issue) => {
                const canDelete = isAdmin || issue.reporterId === currentUserId;
                return (
                  <div
                    key={issue.id}
                    className="hover:bg-muted/40 flex cursor-pointer items-start gap-4 px-4 py-3 transition-colors"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedIssueId(issue.id)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && setSelectedIssueId(issue.id)
                    }
                  >
                    {/* Upvote */}
                    <button
                      className="text-muted-foreground hover:text-primary flex flex-col items-center gap-0.5 pt-0.5 transition-colors"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleUpvoteMutation.mutate({ issueId: issue.id });
                      }}
                    >
                      <ChevronUp
                        className={
                          issue.upvotedByMe ? "text-primary" : undefined
                        }
                      />
                      <span className="text-xs font-medium tabular-nums">
                        {issue.upvoteCount}
                      </span>
                    </button>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={typeConfig[issue.type].variant}>
                          {typeConfig[issue.type].label}
                        </Badge>
                        <span className="font-medium leading-snug">
                          {issue.title}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
                        {issue.description}
                      </p>
                      <div className="text-muted-foreground mt-1.5 flex items-center gap-3 text-xs">
                        <span>{issue.reporterName}</span>
                        <span>·</span>
                        <span>
                          {new Date(issue.createdAt).toLocaleDateString()}
                        </span>
                        {issue.commentCount > 0 && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {issue.commentCount}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right side: status + priority + delete */}
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={statusConfig[issue.status].variant}>
                        {statusConfig[issue.status].label}
                      </Badge>
                      <Badge variant={priorityConfig[issue.priority].variant}>
                        {priorityConfig[issue.priority].label}
                      </Badge>
                      {canDelete && (
                        <button
                          className="text-muted-foreground hover:text-destructive ml-1 transition-colors"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate({ id: issue.id });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <IssueSubmitDialog open={submitOpen} onOpenChange={setSubmitOpen} />
      <IssueDetailSheet
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
      />
    </ContentLayout>
  );
}
