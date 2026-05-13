import { type DocumentCategory } from "../data/schema";

export function DocumentCategoryBadge({
  category,
}: {
  category: Pick<DocumentCategory, "name" | "color">;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: category.color }}
      />
      <span className="text-sm">{category.name}</span>
    </span>
  );
}
