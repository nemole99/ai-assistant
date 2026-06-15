type BadgeVariant =
  | "default"
  | "destructive"
  | "ghost"
  | "link"
  | "outline"
  | "secondary";

type Config<T extends string> = Record<
  T,
  { label: string; variant: BadgeVariant }
>;

export const typeConfig: Config<"bug" | "feature" | "other"> = {
  bug: { label: "Bug", variant: "destructive" },
  feature: { label: "Feature", variant: "secondary" },
  other: { label: "Other", variant: "outline" },
};

export const priorityConfig: Config<"low" | "medium" | "high"> = {
  high: { label: "High", variant: "destructive" },
  low: { label: "Low", variant: "outline" },
  medium: { label: "Medium", variant: "secondary" },
};

export const statusConfig: Config<"open" | "in_progress" | "resolved"> = {
  in_progress: { label: "In Progress", variant: "secondary" },
  open: { label: "Open", variant: "default" },
  resolved: { label: "Resolved", variant: "outline" },
};
