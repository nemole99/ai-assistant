/**
 * Fake evaluation seed — generates realistic-looking data without a legacy DB.
 *
 * Run standalone:
 *   bun --env-file apps/server/.env apps/server/src/seed/seed-evaluation-fake.ts
 *
 * Re-runnable: wipes all evaluation_* data on each run.
 */
/* oxlint-disable */

import { db } from "@workspace/db";
import { employee, project } from "@workspace/db/schema/auth";
import {
  evaluationKpiProductivity,
  evaluationKpiQuality,
  evaluationKpiSharing,
  evaluationKpiSummary,
  evaluationTicket,
  evaluationTimesheetEntry,
  evaluationTimesheetHoliday,
} from "@workspace/db/schema/evaluation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rand(min: number, max: number, decimals = 1): number {
  const v = Math.random() * (max - min) + min;
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function monthsBack(n: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }
  return result;
}

function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y!, m!, 0).getDate();
}

function isWeekend(month: string, day: number): boolean {
  const [y, m] = month.split("-").map(Number);
  const dow = new Date(y!, m! - 1, day).getDay();
  return dow === 0 || dow === 6;
}

// ---------------------------------------------------------------------------
// Fake ticket URLs
// ---------------------------------------------------------------------------

const JIRA_PROJECTS = ["WC", "CD", "GPP", "EZS", "IDP"];

function fakeTicketUrl(): string {
  const proj = pick(JIRA_PROJECTS);
  const num = randInt(100, 9999);
  return `https://ewoosoft.atlassian.net/browse/${proj}-${num}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seedFakeEvaluation() {
  console.log("🚀 Seeding fake Evaluation data...\n");

  // Load employees and projects from DB
  const employees = await db
    .select({
      id: employee.id,
      fullName: employee.fullName,
      level: employee.level,
    })
    .from(employee);
  const projects = await db
    .select({ id: project.id, name: project.name })
    .from(project);

  if (employees.length === 0)
    throw new Error("No employees found. Run seedEmployees first.");
  if (projects.length === 0)
    throw new Error("No projects found. Run seedProjects first.");

  const activeProjects = projects.filter((p) =>
    ["WeClever", "CleverDent", "GPP", "EzSeries", "EzOrtho"].includes(p.name)
  );
  const evalProjects =
    activeProjects.length > 0 ? activeProjects : projects.slice(0, 3);

  console.log(
    `👤 ${employees.length} employees, 📁 ${evalProjects.length} projects`
  );

  // Assign each employee a primary project deterministically
  const empProjectPairs: {
    empId: string;
    projId: string;
    level: "JUNIOR" | "SENIOR";
  }[] = employees.map((e, i) => ({
    empId: e.id,
    level: (e.level ?? (i % 3 === 0 ? "SENIOR" : "JUNIOR")) as
      | "JUNIOR"
      | "SENIOR",
    projId: evalProjects[i % evalProjects.length]!.id,
  }));

  // -------------------------------------------------------------------------
  // 1. Wipe existing evaluation data
  // -------------------------------------------------------------------------
  console.log("\n🗑️  Clearing existing evaluation data...");
  await db.delete(evaluationKpiSummary);
  await db.delete(evaluationKpiQuality);
  await db.delete(evaluationKpiSharing);
  await db.delete(evaluationKpiProductivity);
  await db.delete(evaluationTimesheetEntry);
  await db.delete(evaluationTimesheetHoliday);
  await db.delete(evaluationTicket);
  console.log("  ✅ Done.");

  // -------------------------------------------------------------------------
  // 2. Tickets — 6 months of history, 5-20 tickets/month per employee
  // -------------------------------------------------------------------------
  console.log("\n🎫 Seeding tickets...");

  const months = monthsBack(6);
  const ticketRows: Parameters<typeof db.insert>[0] extends (
    table: typeof evaluationTicket
  ) => infer R
    ? R
    : never[] = [];
  const usedUrls = new Set<string>();

  for (const { empId, projId } of empProjectPairs) {
    for (const month of months) {
      const count = randInt(5, 20);
      const [y, m] = month.split("-").map(Number);
      const days = daysInMonth(month);

      for (let t = 0; t < count; t++) {
        let url: string;
        do {
          url = fakeTicketUrl();
        } while (usedUrls.has(url));
        usedUrls.add(url);

        const day = randInt(1, days);
        const processDate = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const investEst = rand(0.5, 4);
        const investAct = rand(investEst * 0.6, investEst * 1.4);
        const fixEst = rand(1, 8);
        const fixAct = rand(fixEst * 0.7, fixEst * 1.5);
        const revEst = rand(0.5, 3);
        const revAct = rand(revEst * 0.8, revEst * 1.3);
        const totalEffort = rand(
          investAct + fixAct + revAct,
          investAct + fixAct + revAct + 1
        );

        ticketRows.push({
          category: Math.random() < 0.6 ? "bug" : "feature",
          codeFixActual: fixAct,
          codeFixEstimate: fixEst,
          codeReviewActual: revAct,
          codeReviewEstimate: revEst,
          comment:
            Math.random() < 0.3 ? "Spent extra time due to env issues." : null,
          createdAt: new Date(),
          employeeId: empId,
          id: crypto.randomUUID(),
          investigateActual: investAct,
          investigateEstimate: investEst,
          processDate,
          projectId: projId,
          reopenStatus: Math.random() < 0.1 ? 1 : 0,
          ticketUrl: url,
          totalEffort,
          updatedAt: new Date(),
        });
      }
    }
  }

  const BATCH = 50;
  for (let i = 0; i < ticketRows.length; i += BATCH) {
    await db
      .insert(evaluationTicket)
      .values(ticketRows.slice(i, i + BATCH) as any);
  }
  console.log(`  ✅ ${ticketRows.length} tickets inserted.`);

  // -------------------------------------------------------------------------
  // 3. Timesheet — 6 months, weekdays = "x", ~10% half-days, ~5% leave
  // -------------------------------------------------------------------------
  console.log("\n📅 Seeding timesheet...");

  const timesheetRows: any[] = [];

  // Holidays: a few fixed days per month (Vietnamese public holidays approx)
  const holidays: { month: string; day: number }[] = [];
  for (const month of months) {
    const days = daysInMonth(month);
    const [, m] = month.split("-").map(Number);
    // Simulate 1-2 holidays per month
    if (m === 4) {
      holidays.push({ day: 30, month });
    } // Reunification Day
    if (m === 5) {
      holidays.push({ day: 1, month });
    } // Labour Day
    if (m === 9) {
      holidays.push({ day: 2, month });
    } // National Day
    if (m === 1) {
      holidays.push({ day: 1, month });
    } // New Year
    // Random 1 holiday for other months
    if (![1, 4, 5, 9].includes(m!)) {
      holidays.push({ day: randInt(10, days - 5), month });
    }
  }

  const holidaySet = new Set(holidays.map((h) => `${h.month}-${h.day}`));

  await db
    .insert(evaluationTimesheetHoliday)
    .values(holidays.map((h) => ({ id: crypto.randomUUID(), ...h })));
  console.log(`  ✅ ${holidays.length} holidays inserted.`);

  for (const { empId } of empProjectPairs) {
    for (const month of months) {
      const days = daysInMonth(month);
      for (let day = 1; day <= days; day++) {
        if (isWeekend(month, day)) continue;
        if (holidaySet.has(`${month}-${day}`)) continue;

        const r = Math.random();
        let value: string;
        if (r < 0.05)
          value = "-"; // approved leave
        else if (r < 0.12)
          value = "x/2"; // half day
        else value = "x"; // full day

        timesheetRows.push({
          day,
          employeeId: empId,
          id: crypto.randomUUID(),
          month,
          value,
        });
      }
    }
  }

  for (let i = 0; i < timesheetRows.length; i += 100) {
    await db
      .insert(evaluationTimesheetEntry)
      .values(timesheetRows.slice(i, i + 100));
  }
  console.log(`  ✅ ${timesheetRows.length} timesheet entries inserted.`);

  // -------------------------------------------------------------------------
  // 4. KPI tables
  // -------------------------------------------------------------------------
  console.log("\n📊 Seeding KPI data...");

  const monthlyMonths = monthsBack(12);

  for (const { empId, projId, level } of empProjectPairs) {
    const title =
      level === "SENIOR"
        ? "Senior Software Engineer"
        : "Junior Software Engineer";

    // Productivity KPI: target 2.5 tickets/day for senior, 2.0 for junior
    const prodTarget = level === "SENIOR" ? 2.5 : 2.0;
    const prodMonthlyValues: Record<string, number> = {};
    for (const m of monthlyMonths) {
      prodMonthlyValues[m] = rand(prodTarget * 0.7, prodTarget * 1.3);
    }
    const prodResult = rand(prodTarget * 0.8, prodTarget * 1.2);

    await db.insert(evaluationKpiProductivity).values({
      employeeId: empId,
      id: crypto.randomUUID(),
      monthlyValues: prodMonthlyValues,
      projectId: projId,
      result: prodResult,
      target: prodTarget,
      title,
    });

    // Sharing KPI: target 20h/year senior, 10h/year junior
    const shareTarget = level === "SENIOR" ? 20 : 10;
    const shareMonthlyValues: Record<string, number> = {};
    for (const m of monthlyMonths) {
      shareMonthlyValues[m] = rand(0, shareTarget / 8);
    }
    const shareResult = Object.values(shareMonthlyValues).reduce(
      (a, b) => a + b,
      0
    );

    await db.insert(evaluationKpiSharing).values({
      employeeId: empId,
      id: crypto.randomUUID(),
      monthlyValues: shareMonthlyValues,
      projectId: projId,
      result: shareResult,
      target: shareTarget,
      title,
    });

    // Quality KPI: reopen % target 5%, monthly counts
    const reopenPercent = 0.05;
    const totalByMar = randInt(80, 250);
    const qualityMonthlyValues: Record<string, number> = {};
    for (const m of monthlyMonths) {
      qualityMonthlyValues[m] = randInt(0, 3); // reopen count per month
    }
    const reopenNumber = Object.values(qualityMonthlyValues).reduce(
      (a, b) => a + b,
      0
    );
    const qualityResult = reopenNumber / totalByMar;

    await db.insert(evaluationKpiQuality).values({
      employeeId: empId,
      id: crypto.randomUUID(),
      monthlyValues: qualityMonthlyValues,
      projectId: projId,
      reopenNumber,
      reopenPercent,
      result: qualityResult,
      title,
      totalByMar,
    });

    // KPI Summary
    await db.insert(evaluationKpiSummary).values({
      comment: Math.random() < 0.4 ? "Good performance overall." : null,
      employeeId: empId,
      id: crypto.randomUUID(),
      projectId: projId,
      resultProductivity: prodResult,
      resultReopen: qualityResult,
      resultSharing: shareResult,
      targetProductivity: prodTarget,
      targetReopen: reopenPercent,
      targetSharing: shareTarget,
      title,
    });
  }

  console.log(
    `  ✅ ${empProjectPairs.length} KPI rows per table (productivity/sharing/quality/summary).`
  );

  console.log("\n✅ Fake evaluation data seeded successfully!");
  console.log(
    `Summary: ${ticketRows.length} tickets · ${timesheetRows.length} timesheet entries · ${empProjectPairs.length} KPI rows each`
  );
}

// Run if executed directly
if (import.meta.path === Bun.main) {
  seedFakeEvaluation()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
