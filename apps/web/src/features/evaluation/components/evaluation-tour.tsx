import {
  Tour,
  TourArrow,
  TourClose,
  TourDescription,
  TourFooter,
  TourHeader,
  TourNext,
  TourPortal,
  TourPrev,
  TourSkip,
  TourSpotlight,
  TourSpotlightRing,
  TourStep,
  TourStepCounter,
  TourTitle,
} from "@workspace/ui/components/ui/tour";
import { useEffect, useRef } from "react";

interface TourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// --- Tickets Tour ---

const TICKET_STEPS = [
  {
    description: "Bulk import tickets from an Excel file.",
    side: "bottom" as const,
    target: "[data-tour='import-btn']",
    title: "Import tickets",
  },
  {
    description:
      "Fetch resolved Jira tickets and import them as effort tickets.\nRequires a PAT token — set it up in Settings → Jira first.",
    side: "bottom" as const,
    target: "[data-tour='sync-jira-btn']",
    title: "Sync from Jira",
  },
  {
    description: "Filter tickets by developer, project, or category.",
    side: "bottom" as const,
    target: "[data-tour='ticket-filters']",
    title: "Filters",
  },
  {
    description: "Customize which columns are shown in the ticket table.",
    side: "bottom" as const,
    target: "[data-tour='ticket-view']",
    title: "View",
  },
];

export function TicketsTour({ open, onOpenChange }: TourProps) {
  return (
    <Tour open={open} onOpenChange={onOpenChange} modal={false}>
      <TourPortal>
        <TourSpotlight />
        <TourSpotlightRing />
        {TICKET_STEPS.map((s, i) => (
          <TourStep key={i} target={s.target} side={s.side}>
            <TourArrow />
            <TourHeader>
              <TourTitle>{s.title}</TourTitle>
              <TourClose />
            </TourHeader>
            <TourDescription className="max-w-72">
              {s.description}
            </TourDescription>
            <TourFooter>
              <TourStepCounter />
              <div className="flex gap-2">
                <TourSkip>Skip</TourSkip>
                <TourPrev>Back</TourPrev>
                <TourNext>
                  {i === TICKET_STEPS.length - 1 ? "Done" : "Next"}
                </TourNext>
              </div>
            </TourFooter>
          </TourStep>
        ))}
      </TourPortal>
    </Tour>
  );
}

// --- KPI Tour ---

const KPI_STEPS = [
  {
    description:
      "There are 4 views: Summary, Productivity, Sharing, and Quality.",
    side: "bottom" as const,
    tab: null,
    target: "[data-tour='kpi-tabs']",
    title: "KPI views",
  },
  {
    description:
      "Click the Sharing tab to enter your knowledge sharing hours for each month.",
    side: "bottom" as const,
    tab: "sharing",
    target: "[data-tour='kpi-sharing-tab']",
    title: "Enter Sharing hours",
  },
  {
    description:
      "Click the Quality tab to enter the number of re-opened bugs for the current month.",
    side: "bottom" as const,
    tab: "quality",
    target: "[data-tour='kpi-quality-tab']",
    title: "Enter Re-open bugs",
  },
];

interface KpiTourProps extends TourProps {
  onSwitchTab: (tab: string) => void;
}

export function KpiTour({ open, onOpenChange, onSwitchTab }: KpiTourProps) {
  const stepRef = useRef(0);

  const handleValueChange = (value: number) => {
    stepRef.current = value;
    const tab = KPI_STEPS[value]?.tab;
    if (tab) {
      onSwitchTab(tab);
    }
  };

  useEffect(() => {
    if (open) {
      stepRef.current = 0;
    }
  }, [open]);

  return (
    <Tour
      open={open}
      onOpenChange={onOpenChange}
      onValueChange={handleValueChange}
      modal={false}
    >
      <TourPortal>
        <TourSpotlight />
        <TourSpotlightRing />
        {KPI_STEPS.map((s, i) => (
          <TourStep key={i} target={s.target} side={s.side}>
            <TourArrow />
            <TourHeader>
              <TourTitle>{s.title}</TourTitle>
              <TourClose />
            </TourHeader>
            <TourDescription>{s.description}</TourDescription>
            <TourFooter>
              <TourStepCounter />
              <div className="flex gap-2">
                <TourSkip>Skip</TourSkip>
                <TourPrev>Back</TourPrev>
                <TourNext>
                  {i === KPI_STEPS.length - 1 ? "Done" : "Next"}
                </TourNext>
              </div>
            </TourFooter>
          </TourStep>
        ))}
      </TourPortal>
    </Tour>
  );
}
