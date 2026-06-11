import { createFileRoute } from "@tanstack/react-router";

import { WikiPage } from "@/features/wiki";
import { AdminWiki } from "@/features/wiki/admin-wiki";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/wiki/")({
  component: WikiRoute,
});

function WikiRoute() {
  const { data: session } = authClient.useSession();

  if (session?.user?.role === "ADMIN") {
    return <AdminWiki />;
  }

  return <WikiPage />;
}
