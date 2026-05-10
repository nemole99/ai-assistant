import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { StrictMode } from "react";
import Loader from "./components/loader";
import { DirectionProvider } from "./context/direction-provider";
import { ThemeProvider } from "./context/theme-provider";
import { routeTree } from "./routeTree.gen";
import { orpc, queryClient } from "./lib/orpc";

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultPendingComponent: () => <Loader />,
  context: { orpc, queryClient },
  Wrap: function WrapComponent({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ThemeProvider>
        <TooltipProvider>
          <DirectionProvider>
            <RouterProvider router={router} />
          </DirectionProvider>
        </TooltipProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}
