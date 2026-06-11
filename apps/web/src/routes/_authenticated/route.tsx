import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      throw redirect({
        search: { redirect: location.href },
        to: "/sign-in",
      });
    }
    return { user: session.user };
  },
  component: AuthenticatedLayout,
});
