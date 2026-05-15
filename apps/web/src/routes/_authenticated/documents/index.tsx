import { createFileRoute } from "@tanstack/react-router";
import { Documents } from "@/features/documents";
import { AdminDocuments } from "@/features/documents/admin-documents";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/documents/")({
  component: DocumentsRoute,
});

function DocumentsRoute() {
  const { data: session } = authClient.useSession();

  if (session?.user?.role === "ADMIN") {
    return <AdminDocuments />;
  }

  return <Documents />;
}
