import { createContext, useContext, useEffect, useRef, useState } from "react";

export type TourPage = "tickets" | "kpi" | "timesheet";

const TOUR_KEY = "evn-tour-seen";

function getSeenMap(): Record<TourPage, boolean> {
  try {
    const raw = localStorage.getItem(TOUR_KEY);
    if (!raw) {
      return { kpi: false, tickets: false, timesheet: false };
    }
    return { kpi: false, tickets: false, timesheet: false, ...JSON.parse(raw) };
  } catch {
    return { kpi: false, tickets: false, timesheet: false };
  }
}

function markSeen(page: TourPage) {
  const map = getSeenMap();
  localStorage.setItem(TOUR_KEY, JSON.stringify({ ...map, [page]: true }));
}

export function useTour(page: TourPage) {
  const [open, setOpen] = useState(false);
  const { registerTrigger } = useTourTrigger();

  useEffect(() => {
    const map = getSeenMap();
    if (!map[page]) {
      setOpen(true);
    }
  }, [page]);

  // Register this page's trigger with the layout so the ? button works
  useEffect(() => {
    registerTrigger(() => setOpen(true));
    return () => registerTrigger(null);
  }, [registerTrigger]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      markSeen(page);
    }
    setOpen(next);
  };

  return { open, setOpen: handleOpenChange };
}

// The layout owns the provider and stores a ref to the active page's trigger
interface TourTriggerContextValue {
  registerTrigger: (fn: (() => void) | null) => void;
  triggerTour: () => void;
}

export const TourTriggerContext = createContext<TourTriggerContextValue>({
  registerTrigger: () => {},
  triggerTour: () => {},
});

export function useTourTriggerProvider() {
  const triggerRef = useRef<(() => void) | null>(null);

  const registerTrigger = (fn: (() => void) | null) => {
    triggerRef.current = fn;
  };

  const triggerTour = () => {
    triggerRef.current?.();
  };

  return { registerTrigger, triggerTour };
}

export function useTourTrigger() {
  return useContext(TourTriggerContext);
}
