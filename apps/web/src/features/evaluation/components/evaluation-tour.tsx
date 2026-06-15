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
    description: "Import ticket hàng loạt từ file Excel.",
    side: "bottom" as const,
    target: "[data-tour='import-btn']",
    title: "Import ticket",
  },
  {
    description: "Lọc ticket theo developer, project hoặc category.",
    side: "bottom" as const,
    target: "[data-tour='ticket-filters']",
    title: "Bộ lọc",
  },
  {
    description: "Tuỳ chỉnh các cột hiển thị trong bảng ticket.",
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
            <TourDescription>{s.description}</TourDescription>
            <TourFooter>
              <TourStepCounter />
              <div className="flex gap-2">
                <TourSkip>Bỏ qua</TourSkip>
                <TourPrev>Trước</TourPrev>
                <TourNext>
                  {i === TICKET_STEPS.length - 1 ? "Hoàn thành" : "Tiếp"}
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
    description: "Có 4 view: Summary, Productivity, Sharing và Quality.",
    side: "bottom" as const,
    tab: null,
    target: "[data-tour='kpi-tabs']",
    title: "Các view KPI",
  },
  {
    description:
      "Click vào tab Sharing để nhập số giờ knowledge sharing của bạn theo từng tháng.",
    side: "bottom" as const,
    tab: "sharing",
    target: "[data-tour='kpi-sharing-tab']",
    title: "Nhập giờ Sharing",
  },
  {
    description:
      "Click vào tab Quality để nhập số bug re-open của tháng hiện tại.",
    side: "bottom" as const,
    tab: "quality",
    target: "[data-tour='kpi-quality-tab']",
    title: "Nhập bug Re-open",
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
                <TourSkip>Bỏ qua</TourSkip>
                <TourPrev>Trước</TourPrev>
                <TourNext>
                  {i === KPI_STEPS.length - 1 ? "Hoàn thành" : "Tiếp"}
                </TourNext>
              </div>
            </TourFooter>
          </TourStep>
        ))}
      </TourPortal>
    </Tour>
  );
}

// --- Timesheet Tour ---

const TIMESHEET_STEPS = [
  {
    description:
      "Click vào ô ngày của bạn để chuyển trạng thái: ✓ đi làm · ½ nửa ngày · P nghỉ phép.",
    side: "top" as const,
    target: "[data-tour='timesheet-grid']",
    title: "Bảng chấm công",
  },
];

export function TimesheetTour({ open, onOpenChange }: TourProps) {
  return (
    <Tour open={open} onOpenChange={onOpenChange} modal={false}>
      <TourPortal>
        <TourSpotlight />
        <TourSpotlightRing />
        {TIMESHEET_STEPS.map((s, i) => (
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
                <TourSkip>Bỏ qua</TourSkip>
                <TourPrev>Trước</TourPrev>
                <TourNext>
                  {i === TIMESHEET_STEPS.length - 1 ? "Hoàn thành" : "Tiếp"}
                </TourNext>
              </div>
            </TourFooter>
          </TourStep>
        ))}
      </TourPortal>
    </Tour>
  );
}
