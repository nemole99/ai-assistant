import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminDocumentCategories } from "@/features/documents/admin-categories";

export const Route = createFileRoute("/_authenticated/documents/categories")({
  beforeLoad: ({ context }) => {
    if (context.user.role !== "ADMIN") {
      throw redirect({ to: "/documents" });
    }
  },
  component: AdminDocumentCategories,
});
