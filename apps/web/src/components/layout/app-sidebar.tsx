import { useLayout } from "@/context/layout-provider";
import { authClient } from "@/lib/auth-client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import { AppTitle } from "./app-title";
import { sidebarData } from "./data/sidebar-data";
import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";

const EMPLOYEE_HIDDEN_ITEMS = new Set(["/departments", "/employees"]);

export function AppSidebar() {
  const { collapsible, variant } = useLayout();
  const { data: session } = authClient.useSession();
  const isEmployee = session?.user?.role === "EMPLOYEE";

  const navGroups = sidebarData.navGroups
    .map((g) => {
      if (!isEmployee) return g;
      const filtered = g.items.filter(
        (item) => !("url" in item) || !EMPLOYEE_HIDDEN_ITEMS.has(item.url as string),
      );
      return { ...g, items: filtered };
    })
    .filter((g) => g.items.length > 0);

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
