import { createORPCClient } from "@orpc/client";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { AppRouterClient } from "@workspace/api/routers/index";
import { Toaster } from "@workspace/ui/components/sonner";
import { useState } from "react";

import { NavigationProgress } from "@/components/navigation-progress";
import { GeneralError } from "@/features/errors/general-error";

import "../index.css";
import { NotFoundError } from "@/features/errors/not-found-error";
import type { orpc } from "@/lib/orpc";
import { link } from "@/lib/orpc";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  errorComponent: GeneralError,
  head: () => ({
    links: [
      {
        href: "/favicon.ico",
        rel: "icon",
      },
    ],
    meta: [
      {
        title: "Ewoosoft Internal",
      },
      {
        content: "Ewoosoft Internal is a web application",
        name: "description",
      },
    ],
  }),
  notFoundComponent: NotFoundError,
});

function RootComponent() {
  const [client] = useState<AppRouterClient>(() => createORPCClient(link));
  useState(() => createTanstackQueryUtils(client));

  return (
    <>
      <HeadContent />
      <NavigationProgress />
      <Outlet />
      <Toaster richColors />
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
}
