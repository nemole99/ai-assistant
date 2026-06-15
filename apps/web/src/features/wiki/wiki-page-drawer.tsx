import { useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@workspace/ui/components/drawer";
import { Markdown } from "@workspace/ui/components/markdown";
import { Loader2 } from "lucide-react";

import { orpc } from "@/lib/orpc";

interface WikiPageDrawerProps {
  pageId: string;
  onClose: () => void;
}

export function WikiPageDrawer({ pageId, onClose }: WikiPageDrawerProps) {
  const { data: page, isPending } = useQuery({
    ...orpc.wikiPage.get.queryOptions({ input: { id: pageId } }),
  });

  return (
    <Drawer
      open
      direction="right"
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DrawerContent className="w-full sm:max-w-2xl! md:max-w-3xl! lg:max-w-4xl! p-0 border-l border-border h-full max-h-screen">
        <DrawerHeader className="px-6 py-4 border-b shrink-0 flex flex-col items-start text-left">
          <DrawerTitle>
            {isPending ? "Loading…" : (page?.title ?? "WikiPage")}
          </DrawerTitle>
          {page && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <span>/{page.slug}</span>
              {page.sources.length > 0 && (
                <Badge variant="secondary">
                  {page.sources.length} source
                  {page.sources.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          )}
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 p-6">
          {isPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2
                className="animate-spin text-muted-foreground"
                size={24}
              />
            </div>
          ) : page ? (
            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed prose-headings:font-semibold prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-pre:bg-muted prose-pre:text-foreground">
              <Markdown>{page.content}</Markdown>
            </div>
          ) : (
            <p className="text-muted-foreground">Page not found.</p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
