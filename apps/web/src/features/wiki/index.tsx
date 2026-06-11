// oxlint-disable no-nested-ternary
// oxlint-disable no-negated-condition
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import { formatDistanceToNow } from "date-fns";
import { Loader2, BookOpen, Search } from "lucide-react";
import { useState } from "react";

import { ContentLayout } from "@/components/layout/content-layout";
import { orpc } from "@/lib/orpc";

import { WikiPageDrawer } from "./wiki-page-drawer";

export function WikiPage() {
  const [viewingPageId, setViewingPageId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isPending } = useQuery({
    ...orpc.wikiPage.list.queryOptions({ input: { limit: 100, page: 1 } }),
  });

  const items = (data?.items ?? []).filter(
    (p) => !search || p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ContentLayout>
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Wiki</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Company knowledge base compiled from uploaded documents.
        </p>
      </div>

      <div className="mt-5 max-w-lg">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-9"
            placeholder="Search wiki pages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5">
        {isPending ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen size={40} className="text-muted-foreground mb-3" />
            <p className="font-medium">
              {search ? "No pages match your search" : "No wiki pages yet"}
            </p>
            {!search && (
              <p className="text-sm text-muted-foreground mt-1">
                Wiki pages will appear here once documents have been processed.
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((page) => (
              <button
                key={page.id}
                className="text-left border p-4 hover:bg-muted/50 transition-colors"
                onClick={() => setViewingPageId(page.id)}
              >
                <p className="font-medium line-clamp-2">{page.title}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(page.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {page.sourceCount} source{page.sourceCount !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {viewingPageId && (
        <WikiPageDrawer
          pageId={viewingPageId}
          onClose={() => setViewingPageId(null)}
        />
      )}
    </ContentLayout>
  );
}
