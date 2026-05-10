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

const EMPLOYEE_HIDDEN_GROUPS = new Set(["Organization"]);

export function AppSidebar() {
  const { collapsible, variant } = useLayout();
  const { data: session } = authClient.useSession();
  const isEmployee = session?.user?.role === "EMPLOYEE";

  const navGroups = isEmployee
    ? sidebarData.navGroups.filter((g) => !EMPLOYEE_HIDDEN_GROUPS.has(g.title))
    : sidebarData.navGroups;

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
