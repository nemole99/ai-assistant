import { createFileRoute } from "@tanstack/react-router";

import { Issues } from "@/features/issues";

export const Route = createFileRoute("/_authenticated/issues/")({
  component: Issues,
});
