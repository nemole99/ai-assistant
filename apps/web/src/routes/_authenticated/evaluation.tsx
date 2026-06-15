import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router";
import { Separator } from "@workspace/ui/components/separator";

import { ConfigDrawer } from "@/components/config-drawer";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";

const EvaluationLayout = () => {
  const matchRoute = useMatchRoute();

  const links = [
    {
      href: "/evaluation",
      isActive: !!matchRoute({ fuzzy: false, to: "/evaluation" }),
      title: "Tickets",
    },
    {
      href: "/evaluation/kpi",
      isActive: !!matchRoute({ to: "/evaluation/kpi" }),
      title: "KPI",
    },
    {
      href: "/evaluation/timesheet",
      isActive: !!matchRoute({ to: "/evaluation/timesheet" }),
      title: "Timesheet",
    },
  ];

  return (
    <>
      <Header fixed>
        <Separator orientation="vertical" className="h-6" />
        <TopNav links={links} className="me-auto" />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
        <Outlet />
      </Main>
    </>
  );
};

export const Route = createFileRoute("/_authenticated/evaluation")({
  component: EvaluationLayout,
});
