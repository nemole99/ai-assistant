/**
 * Pure import-mapping module for the Evaluation feature.
 *
 * All functions are synchronous and side-effect-free. Resolvers return null on
 * miss — callers accumulate misses and fail loudly with a full list at the end.
 */

// ---------------------------------------------------------------------------
// Project normalization
// ---------------------------------------------------------------------------

/** Alias map: normalized key (lowercase, no spaces) → normalized canonical key */
const PROJECT_ALIAS_MAP: Record<string, string> = {
  we: "weclever",
};

/**
 * Normalizes a raw project name to a lookup key:
 *   lowercase, strips all whitespace, applies alias map.
 */
export function normalizeProjectKey(raw: string): string {
  const stripped = raw.trim().toLowerCase().replaceAll(/\s+/g, "");
  return PROJECT_ALIAS_MAP[stripped] ?? stripped;
}

/**
 * Builds a Map from normalized project key → project id.
 * Called once with the full project list from DB.
 */
export function buildProjectMap(
  projects: { id: string; name: string }[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const proj of projects) {
    map.set(normalizeProjectKey(proj.name), proj.id);
  }
  return map;
}

/** Returns the project id for a raw name, or null if not found. */
export function resolveProject(
  raw: string,
  projectMap: Map<string, string>
): string | null {
  return projectMap.get(normalizeProjectKey(raw)) ?? null;
}

// ---------------------------------------------------------------------------
// Employee (first-name) resolution
// ---------------------------------------------------------------------------

/**
 * Builds a Map from lowercase first-name → employee id.
 *
 * First name = first whitespace-separated token of `fullName`.
 * Returns null entries for ambiguous names (two employees share a first name).
 * The `ambiguous` array lists those names so the caller can fail loudly.
 */
export function buildEmployeeFirstNameMap(
  employees: { id: string; fullName: string }[]
): { ambiguous: string[]; map: Map<string, string> } {
  const seen = new Map<string, string[]>();
  for (const emp of employees) {
    const firstName = (emp.fullName.split(" ")[0] ?? "").toLowerCase();
    const ids = seen.get(firstName) ?? [];
    ids.push(emp.id);
    seen.set(firstName, ids);
  }

  const map = new Map<string, string>();
  const ambiguous: string[] = [];

  for (const [firstName, ids] of seen) {
    if (ids.length === 1) {
      map.set(firstName, ids[0]!);
    } else {
      ambiguous.push(firstName);
    }
  }

  return { ambiguous, map };
}

/** Returns the employee id for a first name, or null if not found. */
export function resolveEmployee(
  firstName: string,
  employeeMap: Map<string, string>
): string | null {
  return employeeMap.get(firstName.trim().toLowerCase()) ?? null;
}

// ---------------------------------------------------------------------------
// Timesheet marker conversion
// ---------------------------------------------------------------------------

/**
 * Converts a raw timesheet cell marker to its numeric day-fraction:
 *   "x"   → 1    (full day present)
 *   "x/2" → 0.5  (half day)
 *   anything else (including "", "-") → 0
 */
export function convertMarker(raw: string): number {
  if (raw === "x") {
    return 1;
  }
  if (raw === "x/2") {
    return 0.5;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Month key helpers
// ---------------------------------------------------------------------------

/** Returns a YYYY-MM string, zero-padded. Month is 1-based. */
export function toYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Category mapping
// ---------------------------------------------------------------------------

/** Maps any non-"bug" category to "feature". */
export function mapCategory(raw: string): "bug" | "feature" {
  return raw.trim().toLowerCase() === "bug" ? "bug" : "feature";
}

// ---------------------------------------------------------------------------
// Empty-cell rules
// ---------------------------------------------------------------------------

/**
 * Inherits missing process dates from the nearest preceding row that has a
 * date (same sheet order). Mutates the array in place.
 */
export function inheritMissingDates<T extends { processDate: string | null }>(
  rows: T[]
): void {
  let lastDate: string | null = null;
  for (const row of rows) {
    if (row.processDate) {
      lastDate = row.processDate;
    } else if (lastDate) {
      row.processDate = lastDate;
    }
  }
}

/**
 * Parses a raw cell value that represents an effort number.
 * Empty / null / undefined → 0 (phase not worked).
 * Numeric string or number → parsed float.
 */
export function parseEffort(raw: unknown): number {
  if (raw === null || raw === undefined || raw === "") {
    return 0;
  }
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Parses a raw cell value that represents total effort.
 * Empty / null / undefined → null (planned total not declared — must not be inferred).
 * Numeric → parsed float, or null if 0 (0 is ambiguous for a planned total).
 */
export function parseTotalEffort(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const n = Number(raw);
  if (Number.isNaN(n) || n === 0) {
    return null;
  }
  return n;
}

/**
 * Parses a raw cell value that represents a reopen count.
 * Empty / null / undefined → 0.
 */
export function parseReopenStatus(raw: unknown): number {
  if (raw === null || raw === undefined || raw === "") {
    return 0;
  }
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// KPI row folding (legacy DB → new schema)
// ---------------------------------------------------------------------------

export interface LegacyKpiRow {
  month: string | null;
  target: number | null;
  result: number | null;
}

export interface FoldedKpi {
  target: number | null;
  result: number | null;
  monthlyValues: Record<string, number>;
}

/**
 * Folds a set of legacy KPI rows for one employee×project into the new schema shape.
 *
 * Legacy shape: one aggregate row (month = null, holds yearly target/result) plus
 * one row per month (month = YYYY-MM, holds that month's result).
 * Handles multiple aggregate rows or duplicate months gracefully — first non-null value wins.
 */
export function foldKpiRows(rows: LegacyKpiRow[]): FoldedKpi {
  const aggregates = rows.filter((r) => r.month === null);
  const monthly = rows.filter((r) => r.month !== null);

  const target = aggregates.find((r) => r.target !== null)?.target ?? null;
  const result = aggregates.find((r) => r.result !== null)?.result ?? null;

  const monthlyValues: Record<string, number> = {};
  for (const row of monthly) {
    if (
      row.month !== null &&
      row.result !== null &&
      !(row.month in monthlyValues)
    ) {
      monthlyValues[row.month] = row.result;
    }
  }

  return { monthlyValues, result, target };
}

// ---------------------------------------------------------------------------
// Date normalization
// ---------------------------------------------------------------------------

/**
 * Normalises a raw process date string to YYYY-MM-DD.
 * Handles: already YYYY-MM-DD, or MM/DD/YYYY (with optional time suffix).
 * Returns null for blank / unparseable values.
 */
export function normalizeDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }

  // SheetJS may return numeric serial dates
  if (typeof raw === "number") {
    // Excel date serial → JS date (days since 1899-12-30)
    const d = new Date(Math.round((raw - 25_569) * 86_400 * 1000));
    return d.toISOString().split("T")[0]!;
  }

  const str = String(raw).trim();
  if (!str) {
    return null;
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // MM/DD/YYYY [HH:mm:ss]
  const mmddyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mmddyyyy) {
    return `${mmddyyyy[3]}-${String(mmddyyyy[1]).padStart(2, "0")}-${String(mmddyyyy[2]).padStart(2, "0")}`;
  }

  return null;
}
