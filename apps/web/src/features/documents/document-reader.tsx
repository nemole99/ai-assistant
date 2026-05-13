import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { ContentLayout } from "@/components/layout/content-layout";
import { orpc } from "@/lib/orpc";
import { DocumentCategoryBadge } from "./components/document-category-badge";

function DocumentReaderSkeleton() {
  return (
    <ContentLayout>
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
        <div className="mt-8 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    </ContentLayout>
  );
}

export function DocumentReader({ id }: { id: string }) {
  const { data: doc, isLoading, isError } = useQuery(
    orpc.document.get.queryOptions({ input: { id } }),
  );

  const downloadUrlMutation = useMutation(
    orpc.document.getDownloadUrl.mutationOptions({
      onSuccess: ({ url }) => {
        const a = window.document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  if (isLoading) return <DocumentReaderSkeleton />;

  if (isError || !doc) {
    return (
      <ContentLayout>
        <div className="flex flex-col items-center gap-4 py-16">
          <p className="text-muted-foreground">Document not found.</p>
          <Button variant="outline" asChild>
            <Link to="/documents">Back to Documents</Link>
          </Button>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/documents">
            <ArrowLeft className="mr-1 size-4" />
            Documents
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
            <DocumentCategoryBadge category={doc.category} />
            <span>{format(new Date(doc.createdAt), "dd MMM yyyy")}</span>
          </div>
          {doc.description && (
            <p className="text-muted-foreground text-sm">{doc.description}</p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => downloadUrlMutation.mutate({ id: doc.id })}
          disabled={downloadUrlMutation.isPending}
        >
          <Download className="mr-2 size-4" />
          {downloadUrlMutation.isPending ? "Getting link…" : "Download PDF"}
        </Button>
      </div>

      {doc.markdownContent ? (
        <article
          className="prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.markdownContent) }}
        />
      ) : (
        <div className="text-muted-foreground py-8 text-center text-sm">
          Content is still being processed…
        </div>
      )}
    </ContentLayout>
  );
}

function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^#{6} (.+)/gm, "<h6>$1</h6>")
    .replace(/^#{5} (.+)/gm, "<h5>$1</h5>")
    .replace(/^#{4} (.+)/gm, "<h4>$1</h4>")
    .replace(/^### (.+)/gm, "<h3>$1</h3>")
    .replace(/^## (.+)/gm, "<h2>$1</h2>")
    .replace(/^# (.+)/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/```[\s\S]*?```/g, (block) => {
      const code = block.replace(/```\w*\n?/, "").replace(/```$/, "");
      return `<pre><code>${code}</code></pre>`;
    })
    .replace(/^[-*] (.+)/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[h|u|p|l|p|c])(.+)/gm, "<p>$1</p>");
}
