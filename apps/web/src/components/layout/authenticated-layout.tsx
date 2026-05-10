import { AppSidebar } from "@/components/layout/app-sidebar";
import { SkipToMain } from "@/components/skip-to-main";
import { LayoutProvider } from "@/context/layout-provider";
import { getCookie } from "@/lib/cookies";
import { Outlet } from "@tanstack/react-router";
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";

type AuthenticatedLayoutProps = {
  children?: React.ReactNode;
};

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie("sidebar_state") !== "false";
  return (
    <LayoutProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <SkipToMain />
        <AppSidebar />
        <SidebarInset
          className={cn(
            // Set content container, so we can use container queries
            "@container/content",

            // If layout is fixed, set the height
            // to 100svh to prevent overflow
            "has-data-[layout=fixed]:h-svh",

            // If layout is fixed and sidebar is inset,
            // set the height to 100svh - spacing (total margins) to prevent overflow
            "peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]",
          )}
        >
          {children ?? <Outlet />}
        </SidebarInset>
      </SidebarProvider>
    </LayoutProvider>
  );
}
