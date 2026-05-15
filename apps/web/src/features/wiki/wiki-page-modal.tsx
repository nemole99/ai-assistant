import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Loader2 } from "lucide-react";

interface WikiPageModalProps {
  pageId: string;
  onClose: () => void;
}

function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^#{6} (.+)/gm, "<h6 class='text-sm font-semibold mt-4 mb-1'>$1</h6>")
    .replace(/^#{5} (.+)/gm, "<h5 class='text-sm font-semibold mt-4 mb-1'>$1</h5>")
    .replace(/^#{4} (.+)/gm, "<h4 class='text-base font-semibold mt-4 mb-1'>$1</h4>")
    .replace(/^### (.+)/gm, "<h3 class='text-base font-semibold mt-5 mb-2'>$1</h3>")
    .replace(/^## (.+)/gm, "<h2 class='text-lg font-semibold mt-6 mb-2'>$1</h2>")
    .replace(/^# (.+)/gm, "<h1 class='text-xl font-bold mt-6 mb-3'>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code class='bg-muted px-1 rounded text-sm'>$1</code>")
    .replace(/```[\s\S]*?```/g, (block) => {
      const code = block.replace(/```\w*\n?/, "").replace(/```$/, "");
      return `<pre class='bg-muted p-3 rounded text-sm overflow-x-auto my-3'><code>${code}</code></pre>`;
    })
    .replace(/^[-*] (.+)/gm, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/(<li.*<\/li>)/s, "<ul class='my-2 space-y-1'>$1</ul>")
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" class="text-primary underline" target="_blank">$1</a>',
    )
    .replace(/\n\n/g, "</p><p class='my-2'>")
    .replace(/^(?!<[h|u|p|l|p|c|a])(.+)/gm, "<p class='my-1'>$1</p>");
}

export function WikiPageModal({ pageId, onClose }: WikiPageModalProps) {
  const { data: page, isPending } = useQuery({
    ...orpc.wikiPage.get.queryOptions({ input: { id: pageId } }),
  });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isPending ? "Loading…" : (page?.title ?? "WikiPage")}</DialogTitle>
          {page && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>/{page.slug}</span>
              {page.sources.length > 0 && (
                <Badge variant="secondary">
                  {page.sources.length} source{page.sources.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1">
          {isPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : page ? (
            <div
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }}
            />
          ) : (
            <p className="text-muted-foreground">Page not found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
