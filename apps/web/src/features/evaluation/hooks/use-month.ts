import { useState } from "react";

/** Returns the current month as a YYYY-MM string. */
export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Month picker state that defaults to the latest month with data
 * (falling back to the current month) until the user picks one.
 */
export function useMonthWithDefault(latestMonth: string | null | undefined) {
  const [override, setOverride] = useState<string | null>(null);
  const month = override ?? latestMonth ?? currentYearMonth();
  return [month, setOverride] as const;
}
