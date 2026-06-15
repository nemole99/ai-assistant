import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import { HelpCircle } from "lucide-react";

import { ConfigDrawer } from "@/components/config-drawer";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import {
  TourTriggerContext,
  useTourTriggerProvider,
} from "@/features/evaluation/hooks/use-tour";

const EvaluationLayout = () => {
  const matchRoute = useMatchRoute();
  const tourTrigger = useTourTriggerProvider();

  const isTickets = !!matchRoute({ fuzzy: false, to: "/evaluation" });
  const isKpi = !!matchRoute({ to: "/evaluation/kpi" });
  const isTimesheet = !!matchRoute({ to: "/evaluation/timesheet" });

  const links = [
    {
      href: "/evaluation",
      isActive: isTickets,
      title: "Tickets",
    },
    {
      href: "/evaluation/kpi",
      isActive: isKpi,
      title: "KPI",
    },
    {
      href: "/evaluation/timesheet",
      isActive: isTimesheet,
      title: "Timesheet",
    },
  ];

  return (
    <TourTriggerContext.Provider value={tourTrigger}>
      <Header fixed>
        <Separator orientation="vertical" className="h-6" />
        <TopNav links={links} className="me-auto" />
        <Button
          variant="ghost"
          size="icon"
          onClick={tourTrigger.triggerTour}
          title="Hướng dẫn sử dụng"
        >
          <HelpCircle className="size-5" />
        </Button>
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
        <Outlet />
      </Main>
    </TourTriggerContext.Provider>
  );
};

export const Route = createFileRoute("/_authenticated/evaluation")({
  component: EvaluationLayout,
});
