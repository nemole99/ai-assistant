import { readFileSync } from "node:fs";
import { join } from "node:path";

import { db } from "@workspace/db";
import {
  copilotTicket,
  copilotTimesheetEntry,
  copilotTimesheetHoliday,
  copilotKpiProductivity,
  copilotKpiSharing,
  copilotKpiQuality,
  copilotKpiSummary,
} from "@workspace/db/schema/copilot-evaluation";

const MIGRATION_DIR = join(import.meta.dir, "../../../../migration-export");

function readJson<T>(relativePath: string): T {
  const content = readFileSync(join(MIGRATION_DIR, relativePath), "utf-8");
  return JSON.parse(content) as T;
}

function mapCategory(cat: string): "bug" | "feature" {
  if (cat === "bug") {
    return "bug";
  }
  return "feature"; // "feature", "Improvement", "new development", "Sub-task", "Task" → feature
}

/** Normalize developer field: convert emails to first name (capitalized) */
function normalizeDeveloper(raw: string): string {
  if (raw.includes("@")) {
    const localPart = raw.split("@")[0]!;
    const firstName = localPart.split(".")[0]!;
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }
  return raw;
}

/** Ticket prefix → canonical project (unambiguous mappings only) */
const PREFIX_TO_PROJECT: Record<string, string> = {
  CONE: "Clever One",
  EEEN: "EzSeries",
  ETWO: "EzSeries",
  EVNCRC: "CleverRC",
  EVNGPP: "GPP",
  EVNIDP: "IDP",
  EVNL: "LMP",
  EVNWCL: "WeClever",
  GPMS: "CleverDent",
  VCTV: "EzSeries",
};

/** Case-insensitive alias → canonical project */
const PROJECT_ALIASES: Record<string, string> = {
  we: "WeClever",
  weclever: "WeClever",
};

/** Normalize project name using aliases and optional ticket URL prefix */
function normalizeProject(raw: string, ticketUrl?: string): string {
  const alias = PROJECT_ALIASES[raw.toLowerCase()];
  if (alias) {
    return alias;
  }

  if (ticketUrl) {
    const match = ticketUrl.match(/([A-Z][A-Z0-9]+)-\d+/);
    if (match) {
      const prefixProject = PREFIX_TO_PROJECT[match[1]!];
      if (prefixProject) {
        return prefixProject;
      }
    }
  }

  return raw;
}

function normalizeDate(raw: string): string | null {
  if (!raw || raw.trim() === "") {
    return null;
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // MM/DD/YYYY HH:mm:ss or MM/DD/YYYY
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    return `${match[3]}-${match[1]}-${match[2]}`;
  }

  return null;
}

async function seedTickets() {
  console.log("🎫 Seeding tickets...");

  const rawTickets = readJson<
    {
      index: number;
      developer: string;
      project: string;
      category: string;
      ticket: string;
      processDate: string;
      totalEffort: number | null;
      investigateEstimate: number;
      investigateActual: number;
      codeFixEstimate: number;
      codeFixActual: number;
      codeReviewEstimate: number;
      codeReviewActual: number;
      reopenStatus: number | null;
      comment: string;
    }[]
  >("tickets.json");

  // Deduplicate by ticket URL (keep last occurrence), trim whitespace from URLs
  const seen = new Map<string, (typeof rawTickets)[number]>();
  for (const t of rawTickets) {
    const url = t.ticket.trim();
    seen.set(url, { ...t, ticket: url });
  }
  // Filter out tickets with invalid dates
  const tickets = [...seen.values()].filter((t) => {
    const date = normalizeDate(t.processDate);
    if (!date) {
      console.log(
        `  ⚠ Skipping ticket "${t.ticket}" — invalid date: "${t.processDate}"`
      );
      return false;
    }
    return true;
  });

  // Clear existing data
  await db.delete(copilotTicket);

  // Insert in batches of 20 (to stay within PG param limits)
  const batchSize = 20;
  for (let i = 0; i < tickets.length; i += batchSize) {
    const batch = tickets.slice(i, i + batchSize);
    await db.insert(copilotTicket).values(
      batch.map((t) => ({
        category: mapCategory(t.category),
        codeFixActual: t.codeFixActual ?? 0,
        codeFixEstimate: t.codeFixEstimate ?? 0,
        codeReviewActual: t.codeReviewActual ?? 0,
        codeReviewEstimate: t.codeReviewEstimate ?? 0,
        comment: t.comment || null,
        developer: normalizeDeveloper(t.developer),
        id: crypto.randomUUID(),
        investigateActual: t.investigateActual ?? 0,
        investigateEstimate: t.investigateEstimate ?? 0,
        processDate: normalizeDate(t.processDate)!,
        project: normalizeProject(t.project, t.ticket),
        reopenStatus: t.reopenStatus ?? 0,
        ticketUrl: t.ticket,
        totalEffort: t.totalEffort ?? 0,
      }))
    );
  }

  console.log(
    `  ✅ ${tickets.length} tickets imported (${rawTickets.length - tickets.length} duplicates removed)`
  );
}

async function seedTimesheet() {
  console.log("📅 Seeding timesheet...");

  // Clear existing
  await db.delete(copilotTimesheetEntry);
  await db.delete(copilotTimesheetHoliday);

  const months = ["2026-04", "2026-05"];
  let entryCount = 0;
  let holidayCount = 0;

  for (const month of months) {
    const data = readJson<{
      month: string;
      employees: {
        name: string;
        days: { day: number; value: string; isHoliday: boolean }[];
      }[];
    }>(`timesheet/${month}.json`);

    // Extract holidays from first employee's data (holidays are shared)
    const holidays = data.employees[0]?.days.filter((d) => d.isHoliday) ?? [];
    if (holidays.length > 0) {
      await db.insert(copilotTimesheetHoliday).values(
        holidays.map((h) => ({
          day: h.day,
          id: crypto.randomUUID(),
          month: data.month,
        }))
      );
      holidayCount += holidays.length;
    }

    // Insert attendance entries (only "x" values)
    for (const emp of data.employees) {
      const presentDays = emp.days.filter((d) => d.value === "x");
      if (presentDays.length > 0) {
        await db.insert(copilotTimesheetEntry).values(
          presentDays.map((d) => ({
            day: d.day,
            employeeName: emp.name,
            id: crypto.randomUUID(),
            month: data.month,
            value: "x",
          }))
        );
        entryCount += presentDays.length;
      }
    }
  }

  console.log(
    `  ✅ ${entryCount} timesheet entries, ${holidayCount} holidays imported`
  );
}

function monthsToJsonb(
  months: Record<string, number | null>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(months)) {
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

async function seedKpi() {
  console.log("📊 Seeding KPI data...");

  // Clear existing
  await db.delete(copilotKpiProductivity);
  await db.delete(copilotKpiSharing);
  await db.delete(copilotKpiQuality);
  await db.delete(copilotKpiSummary);

  // Productivity
  const productivity = readJson<{
    developers: {
      developer: string;
      project: string;
      title: string;
      target: number;
      averageResult: number;
      months: Record<string, number | null>;
    }[];
  }>("kpi/productivity.json");

  await db.insert(copilotKpiProductivity).values(
    productivity.developers.map((d) => ({
      developer: d.developer,
      id: crypto.randomUUID(),
      monthlyValues: monthsToJsonb(d.months),
      project: d.project,
      result: d.averageResult,
      target: d.target,
      title: d.title,
    }))
  );
  console.log(`  ✅ ${productivity.developers.length} productivity records`);

  // Sharing
  const sharing = readJson<{
    developers: {
      developer: string;
      project: string;
      title: string;
      target: number;
      result: number;
      months: Record<string, number | null>;
    }[];
  }>("kpi/sharing.json");

  await db.insert(copilotKpiSharing).values(
    sharing.developers.map((d) => ({
      developer: d.developer,
      id: crypto.randomUUID(),
      monthlyValues: monthsToJsonb(d.months),
      project: d.project,
      result: d.result,
      target: d.target,
      title: d.title,
    }))
  );
  console.log(`  ✅ ${sharing.developers.length} sharing records`);

  // Quality
  const quality = readJson<{
    developers: {
      developer: string;
      project: string;
      title: string;
      reopenPct: number;
      totalByMar: number;
      reopenNumber: number;
      result: number;
      months: Record<string, number | null>;
    }[];
  }>("kpi/quality.json");

  await db.insert(copilotKpiQuality).values(
    quality.developers.map((d) => ({
      developer: d.developer,
      id: crypto.randomUUID(),
      monthlyValues: monthsToJsonb(d.months),
      project: d.project,
      reopenNumber: d.reopenNumber,
      reopenPercent: d.reopenPct,
      result: d.result,
      title: d.title,
      totalByMar: d.totalByMar,
    }))
  );
  console.log(`  ✅ ${quality.developers.length} quality records`);

  // Summary
  const summary = readJson<{
    developers: {
      developer: string;
      project: string;
      title: string;
      targetProductivity: number;
      targetReopen: number;
      targetSharing: number;
      resultProductivity: number;
      resultReopen: number;
      resultSharing: number;
      comment: string;
    }[];
  }>("kpi/summary.json");

  await db.insert(copilotKpiSummary).values(
    summary.developers.map((d) => ({
      comment: d.comment || null,
      developer: d.developer,
      id: crypto.randomUUID(),
      project: d.project,
      resultProductivity: d.resultProductivity,
      resultReopen: d.resultReopen,
      resultSharing: d.resultSharing,
      targetProductivity: d.targetProductivity,
      targetReopen: d.targetReopen,
      targetSharing: d.targetSharing,
      title: d.title,
    }))
  );
  console.log(`  ✅ ${summary.developers.length} summary records`);
}

async function main() {
  console.log("🚀 Seeding Copilot Evaluation data from migration-export...\n");

  await seedTickets();
  await seedTimesheet();
  await seedKpi();

  console.log("\n✅ All Copilot Evaluation data seeded successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
