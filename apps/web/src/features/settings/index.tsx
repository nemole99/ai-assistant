import { ContentLayout } from "@/components/layout/content-layout";
import { authClient } from "@/lib/auth-client";
import { Outlet } from "@tanstack/react-router";
import { Separator } from "@workspace/ui/components/separator";
import { Bot, KeyRound, ServerCog, UserCog } from "lucide-react";
import { SidebarNav } from "./components/sidebar-nav";

const baseNavItems = [
  {
    title: "Profile",
    href: "/settings",
    icon: <UserCog size={18} />,
  },
  {
    title: "AI Providers",
    href: "/settings/ai-providers",
    icon: <Bot size={18} />,
  },
  {
    title: "Password",
    href: "/settings/password",
    icon: <KeyRound size={18} />,
  },
];

const adminNavItems = [
  {
    title: "System AI",
    href: "/settings/system-ai",
    icon: <ServerCog size={18} />,
  },
];

export function Settings() {
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;

  return (
    <ContentLayout>
      <div className="space-y-0.5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and AI provider connections.</p>
      </div>
      <Separator className="my-4 lg:my-6" />
      <div className="flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12">
        <aside className="top-0 lg:sticky lg:w-1/5">
          <SidebarNav items={navItems} />
        </aside>
        <div className="flex w-full overflow-y-hidden p-1">
          <Outlet />
        </div>
      </div>
    </ContentLayout>
  );
}
