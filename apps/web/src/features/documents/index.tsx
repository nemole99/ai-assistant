import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { BookOpen, Search } from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { ContentLayout } from "@/components/layout/content-layout";
import { Loader } from "@/components/loader";
import { orpc } from "@/lib/orpc";
import { cn } from "@workspace/ui/lib/utils";

export function Documents() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: categories = [] } = useQuery(
    orpc.documentCategory.list.queryOptions(),
  );

  const { data: documents = [], isLoading } = useQuery(
    orpc.document.list.queryOptions({
      input: {
        categoryId: selectedCategoryId ?? undefined,
        query: debouncedSearch || undefined,
      },
    }),
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }

  return (
    <ContentLayout>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Documents</h2>
        <p className="text-muted-foreground">
          Company-wide documents, policies, and guidelines.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
          <Input
            className="pl-8"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedCategoryId(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition-colors",
            selectedCategoryId === null
              ? "bg-primary text-primary-foreground border-transparent"
              : "hover:bg-accent",
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() =>
              setSelectedCategoryId(
                selectedCategoryId === cat.id ? null : cat.id,
              )
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
              selectedCategoryId === cat.id
                ? "border-transparent"
                : "hover:bg-accent",
            )}
            style={
              selectedCategoryId === cat.id
                ? { backgroundColor: cat.color, color: "white" }
                : {}
            }
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: selectedCategoryId === cat.id ? "white" : cat.color }}
            />
            {cat.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loader />
      ) : documents.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>No documents found</EmptyTitle>
            <EmptyDescription>
              {search || selectedCategoryId
                ? "Try adjusting your search or filter."
                : "No documents have been published yet."}
            </EmptyDescription>
          </EmptyHeader>
          {(search || selectedCategoryId) && (
            <EmptyContent>
              <button
                type="button"
                className="text-primary text-sm underline"
                onClick={() => { setSearch(""); setDebouncedSearch(""); setSelectedCategoryId(null); }}
              >
                Clear filters
              </button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              to="/documents/$id"
              params={{ id: doc.id }}
              className="hover:bg-accent group rounded-lg border p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium leading-tight group-hover:underline">
                  {doc.title}
                </h3>
                <span
                  className="mt-0.5 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: doc.category.color }}
                  title={doc.category.name}
                />
              </div>
              {doc.description && (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                  {doc.description}
                </p>
              )}
              <div className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-xs">
                  {doc.category.name}
                </Badge>
                <span>{format(new Date(doc.createdAt), "dd MMM yyyy")}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </ContentLayout>
  );
}
