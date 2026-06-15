/**
 * Evaluation seed — imports historical data from the legacy riskradar
 * Postgres database.
 *
 * Configure in apps/server/.env:
 *   LEGACY_EVALUATION_DATABASE_URL=postgresql://aiassistant:aiassistant@172.76.10.246:5432/riskradar
 *
 * Run standalone:
 *   bun --env-file ../../apps/server/.env apps/server/src/seed/seed-evaluation.ts
 *
 * Re-runnable: wipes all evaluation_* data on each run. Safe to repeat until
 * cutover day (team keeps entering data in the legacy app until then).
 *
 * Cutover baseline — verify counts after final import:
 *   1409 tickets · 2060 timesheet entries · 72/55/39 productivity/sharing/quality KPI rows
 */

import {
  buildEmployeeFirstNameMap,
  buildProjectMap,
  foldKpiRows,
  mapCategory,
  parseEffort,
  parseReopenStatus,
  parseTotalEffort,
  resolveEmployee,
  resolveProject,
} from "@workspace/api/import-mapping";
import type { FoldedKpi } from "@workspace/api/import-mapping";
import { db } from "@workspace/db";
import { employee, project } from "@workspace/db/schema/auth";
import {
  evaluationKpiProductivity,
  evaluationKpiQuality,
  evaluationKpiSharing,
  evaluationKpiSummary,
  evaluationTicket,
  evaluationTimesheetEntry,
} from "@workspace/db/schema/evaluation";
import { SQL } from "bun";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Legacy DB row types (live schema — evaluation columns only; risk/riskreason
// are not imported and remain with the riskradar app)
// ---------------------------------------------------------------------------

interface LegacyEmployee {
  id: number;
  name: string;
  project: string | null;
  title: string | null;
}

interface LegacyTicket {
  id: number;
  developer: string;
  project: string | null;
  category: string | null;
  ticket: string | null;
  process_date: string | null;
  total_effort_hours: string | null;
  investigate_estimation: string | null;
  investigate_actual: string | null;
  codefixing_estimate: string | null;
  codefixing_actual: string | null;
  codereview_estimate: string | null;
  codereview_actual: string | null;
  reopen_status: string | null;
  comment: string | null;
}

interface LegacyTimesheetRow {
  employee_id: number;
  month: string;
  day: number;
  value: string | null;
}

interface LegacyKpiRaw {
  employee_id: number;
  month: string | null;
  target: string | null;
  result: string | null;
}

// ---------------------------------------------------------------------------
// Step 1: Update employee.level from legacy title
// ---------------------------------------------------------------------------

async function updateEmployeeLevels(
  legacyEmployees: LegacyEmployee[],
  empMap: Map<string, string>
): Promise<void> {
  console.log("👤 Updating employee levels...");

  let updated = 0;
  for (const legEmp of legacyEmployees) {
    const firstName = (legEmp.name.trim().split(" ")[0] ?? "").toLowerCase();
    const empId = resolveEmployee(firstName, empMap);
    if (!empId || !legEmp.title) {
      continue;
    }

    const titleLower = legEmp.title.trim().toLowerCase();
    let level: "JUNIOR" | "SENIOR" | null = null;
    if (titleLower.includes("junior")) {
      level = "JUNIOR";
    } else if (titleLower.includes("senior")) {
      level = "SENIOR";
    }

    if (level) {
      await db.update(employee).set({ level }).where(eq(employee.id, empId));
      updated++;
    }
  }

  console.log(`  ✅ ${updated} employee levels set.`);
}

// ---------------------------------------------------------------------------
// Step 2: Tickets
// ---------------------------------------------------------------------------

async function seedTickets(
  legacy: SQL,
  empMap: Map<string, string>,
  projMap: Map<string, string>
): Promise<void> {
  console.log("\n🎫 Seeding tickets...");

  const rows = (await legacy`
    SELECT id, developer, project, category, ticket,
           TO_CHAR(process_date, 'YYYY-MM-DD') AS process_date,
           total_effort_hours, investigate_estimation, investigate_actual,
           codefixing_estimate, codefixing_actual,
           codereview_estimate, codereview_actual,
           reopen_status, comment
    FROM copilot_evaluation
    WHERE ticket IS NOT NULL AND ticket <> ''
    ORDER BY id
  `) as LegacyTicket[];

  const unresolved: string[] = [];

  interface Resolved {
    employeeId: string;
    projectId: string;
    category: "bug" | "feature";
    ticketUrl: string;
    processDate: string;
    totalEffort: number | null;
    investigateEstimate: number;
    investigateActual: number;
    codeFixEstimate: number;
    codeFixActual: number;
    codeReviewEstimate: number;
    codeReviewActual: number;
    reopenStatus: number;
    comment: string | null;
  }

  const resolved: Resolved[] = [];

  for (const row of rows) {
    if (!row.ticket) {
      continue;
    }

    const empId = resolveEmployee(row.developer, empMap);
    if (!empId) {
      unresolved.push(`  ticket id=${row.id}: developer "${row.developer}"`);
      continue;
    }

    const projId = resolveProject(row.project ?? "", projMap);
    if (!projId) {
      unresolved.push(
        `  ticket id=${row.id}: project "${row.project}" (dev: ${row.developer})`
      );
      continue;
    }

    if (!row.process_date) {
      unresolved.push(`  ticket id=${row.id}: missing process_date`);
      continue;
    }

    resolved.push({
      category: mapCategory(row.category ?? ""),
      codeFixActual: parseEffort(row.codefixing_actual),
      codeFixEstimate: parseEffort(row.codefixing_estimate),
      codeReviewActual: parseEffort(row.codereview_actual),
      codeReviewEstimate: parseEffort(row.codereview_estimate),
      comment: row.comment || null,
      employeeId: empId,
      investigateActual: parseEffort(row.investigate_actual),
      investigateEstimate: parseEffort(row.investigate_estimation),
      processDate: row.process_date,
      projectId: projId,
      reopenStatus: parseReopenStatus(row.reopen_status),
      ticketUrl: row.ticket,
      totalEffort: parseTotalEffort(row.total_effort_hours),
    });
  }

  if (unresolved.length > 0) {
    throw new Error(
      `❌ Tickets: ${unresolved.length} unresolvable row(s):\n${unresolved.join("\n")}`
    );
  }

  await db.delete(evaluationTicket);

  const BATCH = 50;
  for (let i = 0; i < resolved.length; i += BATCH) {
    await db
      .insert(evaluationTicket)
      .values(
        resolved
          .slice(i, i + BATCH)
          .map((r) => ({ id: crypto.randomUUID(), ...r }))
      );
  }

  console.log(`  ✅ ${resolved.length} tickets inserted.`);
}

// ---------------------------------------------------------------------------
// Step 3: Timesheet
// ---------------------------------------------------------------------------

async function seedTimesheet(
  legacy: SQL,
  legacyEmployees: LegacyEmployee[],
  empMap: Map<string, string>
): Promise<void> {
  console.log("\n📅 Seeding timesheet...");

  const rows = (await legacy`
    SELECT employee_id, month, day, value
    FROM timesheet
    WHERE value IS NOT NULL AND value <> ''
    ORDER BY employee_id, month, day
  `) as LegacyTimesheetRow[];

  const legEmpById = new Map(legacyEmployees.map((e) => [e.id, e]));
  const unresolved = new Set<string>();
  const orphanWarnings: string[] = [];

  const entries: {
    day: number;
    employeeId: string;
    id: string;
    month: string;
    value: string;
  }[] = [];

  for (const row of rows) {
    const v = row.value ?? "";
    if (v === "") {
      continue;
    }

    const legEmp = legEmpById.get(row.employee_id);
    if (!legEmp) {
      // Orphan row: references a deleted legacy employee record.
      // Skip with warning — fix by hand after migration if the days matter.
      orphanWarnings.push(
        `  timesheet row (employee_id=${row.employee_id}, month=${row.month}, day=${row.day}, value=${v}): no matching legacy employee record`
      );
      continue;
    }

    const firstName = (legEmp.name.trim().split(" ")[0] ?? "").toLowerCase();
    const empId = resolveEmployee(firstName, empMap);
    if (!empId) {
      unresolved.add(`${legEmp.name} (legacy id ${row.employee_id})`);
      continue;
    }

    entries.push({
      day: row.day,
      employeeId: empId,
      id: crypto.randomUUID(),
      month: row.month,
      value: v,
    });
  }

  if (orphanWarnings.length > 0) {
    console.warn(
      `  ⚠️  ${orphanWarnings.length} orphan timesheet row(s) skipped (legacy employee record deleted):\n${orphanWarnings.join("\n")}`
    );
  }

  if (unresolved.size > 0) {
    throw new Error(
      `❌ Timesheet: unresolved employees: ${[...unresolved].join(", ")}`
    );
  }

  await db.delete(evaluationTimesheetEntry);

  const BATCH = 100;
  for (let i = 0; i < entries.length; i += BATCH) {
    await db
      .insert(evaluationTimesheetEntry)
      .values(entries.slice(i, i + BATCH));
  }

  console.log(`  ✅ ${entries.length} timesheet entries inserted.`);
}

// ---------------------------------------------------------------------------
// Step 4: KPI tables
// ---------------------------------------------------------------------------

async function importKpiRows(
  rawRows: LegacyKpiRaw[],
  legEmpById: Map<number, LegacyEmployee>,
  empMap: Map<string, string>,
  projMap: Map<string, string>,
  tableName: string,
  insert: (
    empId: string,
    projId: string,
    title: string | null,
    folded: FoldedKpi
  ) => Promise<void>
): Promise<number> {
  // Group rows by (legacy_employee_id : project_name)
  type KpiGroupKey = string; // "legId:projectName"
  const groups = new Map<
    KpiGroupKey,
    { month: string | null; target: number | null; result: number | null }[]
  >();

  for (const row of rawRows) {
    const legEmp = legEmpById.get(row.employee_id);
    if (!legEmp) {
      continue;
    }

    const projectName = legEmp.project ?? "Other";
    const key: KpiGroupKey = `${row.employee_id}:${projectName}`;
    const group = groups.get(key) ?? [];
    group.push({
      month: row.month,
      result: row.result !== null ? Number(row.result) || null : null,
      target: row.target !== null ? Number(row.target) || null : null,
    });
    groups.set(key, group);
  }

  const unresolved: string[] = [];
  let count = 0;

  for (const [key, groupRows] of groups) {
    const colonIdx = key.indexOf(":");
    const legId = Number(key.slice(0, colonIdx));
    const projectName = key.slice(colonIdx + 1);

    const legEmp = legEmpById.get(legId);
    if (!legEmp) {
      continue;
    }

    const firstName = (legEmp.name.trim().split(" ")[0] ?? "").toLowerCase();
    const empId = resolveEmployee(firstName, empMap);
    if (!empId) {
      unresolved.push(
        `  ${tableName}: employee "${legEmp.name}" (legacy id ${legId})`
      );
      continue;
    }

    const projId = resolveProject(projectName, projMap);
    if (!projId) {
      unresolved.push(
        `  ${tableName}: project "${projectName}" for employee "${legEmp.name}"`
      );
      continue;
    }

    const folded = foldKpiRows(groupRows);
    await insert(empId, projId, legEmp.title ?? null, folded);
    count++;
  }

  if (unresolved.length > 0) {
    throw new Error(
      `❌ ${unresolved.length} unresolvable KPI rows:\n${unresolved.join("\n")}`
    );
  }

  return count;
}

async function seedKpi(
  legacy: SQL,
  legacyEmployees: LegacyEmployee[],
  empMap: Map<string, string>,
  projMap: Map<string, string>
): Promise<void> {
  console.log("\n📊 Seeding KPI data...");

  await db.delete(evaluationKpiProductivity);
  await db.delete(evaluationKpiSharing);
  await db.delete(evaluationKpiQuality);
  await db.delete(evaluationKpiSummary);

  const legEmpById = new Map(legacyEmployees.map((e) => [e.id, e]));

  // Productivity
  const prodRows = (await legacy`
    SELECT employee_id, month, target, result FROM productivity_kpi ORDER BY employee_id, month
  `) as LegacyKpiRaw[];

  const prodCount = await importKpiRows(
    prodRows,
    legEmpById,
    empMap,
    projMap,
    "productivity_kpi",
    async (empId, projId, title, folded) => {
      await db.insert(evaluationKpiProductivity).values({
        employeeId: empId,
        id: crypto.randomUUID(),
        monthlyValues: folded.monthlyValues,
        projectId: projId,
        result: folded.result,
        target: folded.target,
        title,
      });
    }
  );
  console.log(`  ✅ ${prodCount} productivity KPI rows.`);

  // Sharing
  const sharingRows = (await legacy`
    SELECT employee_id, month, target, result FROM sharing_kpi ORDER BY employee_id, month
  `) as LegacyKpiRaw[];

  const sharingCount = await importKpiRows(
    sharingRows,
    legEmpById,
    empMap,
    projMap,
    "sharing_kpi",
    async (empId, projId, title, folded) => {
      await db.insert(evaluationKpiSharing).values({
        employeeId: empId,
        id: crypto.randomUUID(),
        monthlyValues: folded.monthlyValues,
        projectId: projId,
        result: folded.result,
        target: folded.target,
        title,
      });
    }
  );
  console.log(`  ✅ ${sharingCount} sharing KPI rows.`);

  // Quality — legacy aggregate row: target = re-open % (fraction, e.g. 0.05),
  // result = total tickets by March baseline. Monthly rows = re-open counts.
  // reopenNumber and the yearly result are derived at read time (listQuality).
  const qualityRows = (await legacy`
    SELECT employee_id, month, target, result FROM quality_kpi ORDER BY employee_id, month
  `) as LegacyKpiRaw[];

  const qualityCount = await importKpiRows(
    qualityRows,
    legEmpById,
    empMap,
    projMap,
    "quality_kpi",
    async (empId, projId, title, folded) => {
      await db.insert(evaluationKpiQuality).values({
        employeeId: empId,
        id: crypto.randomUUID(),
        monthlyValues: folded.monthlyValues,
        projectId: projId,
        reopenNumber: null,
        reopenPercent: folded.target,
        result: null,
        title,
        totalByMar: folded.result,
      });
    }
  );
  console.log(`  ✅ ${qualityCount} quality KPI rows.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function seedEvaluation() {
  console.log("🚀 Seeding Evaluation data from legacy DB...\n");

  const legacyUrl = process.env.LEGACY_EVALUATION_DATABASE_URL;
  if (!legacyUrl) {
    throw new Error(
      "LEGACY_EVALUATION_DATABASE_URL is not set.\n" +
        "Add it to apps/server/.env:\n" +
        "  LEGACY_EVALUATION_DATABASE_URL=postgresql://aiassistant:aiassistant@172.76.10.246:5432/riskradar"
    );
  }

  const legacy = new SQL(legacyUrl);

  try {
    // Load legacy employee master data
    const legacyEmployees = (await legacy`
      SELECT id, name, project, title FROM employees ORDER BY id
    `) as LegacyEmployee[];

    console.log(`📋 Found ${legacyEmployees.length} legacy employees.`);

    // Build resolver maps from ai-assistant DB
    const allEmployees = await db
      .select({ fullName: employee.fullName, id: employee.id })
      .from(employee);
    const { ambiguous, map: empMap } = buildEmployeeFirstNameMap(allEmployees);
    if (ambiguous.length > 0) {
      throw new Error(
        `❌ Ambiguous employee first names: ${ambiguous.join(", ")}\n` +
          "Fix: two employees share a first name — distinguish by fullName or resolve manually."
      );
    }

    const allProjects = await db
      .select({ id: project.id, name: project.name })
      .from(project);
    const projMap = buildProjectMap(allProjects);

    await updateEmployeeLevels(legacyEmployees, empMap);
    await seedTickets(legacy, empMap, projMap);
    await seedTimesheet(legacy, legacyEmployees, empMap);
    await seedKpi(legacy, legacyEmployees, empMap, projMap);

    console.log("\n✅ Evaluation data seeded successfully!");
    console.log(
      "Cutover baseline: 1409 tickets · 2060 timesheet entries · 72/55/39 productivity/sharing/quality KPI rows."
    );
  } finally {
    await legacy.close();
  }
}

// Run if executed directly
if (import.meta.path === Bun.main) {
  seedEvaluation()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
