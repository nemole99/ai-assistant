# Evaluation — Developer Performance Tracking

Status: ready-for-agent

> Supersedes the original "Copilot Evaluation" PRD (formerly `0006-copilot-evaluation.md`). Rewritten after a grill session against `CONTEXT.md` — the glossary there is the source of truth for all terms used below (**Evaluation**, **EvaluatedDeveloper**, **EvaluationProject**, **EvaluationEffortTicket**, **EvaluationTimesheet**, **SharingLog**, **EvaluationTarget**, **EmployeeLevel**, **JiraTicketImport**).
>
> **Revision 1 (2026-06-12):** updated after a second grill session. The historical data source is no longer the Excel workbook — the team migrated it into a standalone legacy app, which stores it in its own live Postgres. This PRD describes a one-time cutover import from that legacy database, after which ai-assistant is the sole source of truth for evaluation data.
>
> **Revision 2 (2026-06-12):** updated after a third grill session against the live legacy DB. The legacy app has evolved into **`riskradar`** (new host/database: `riskradar` @ `172.76.10.246:5432`) and grew its own risk-analysis features — those are **out of scope**; the cutover covers evaluation data only, and the riskradar app itself keeps running for its risk features. Changes from data re-verification: the duplicate "Ben" employee was already cleaned up in the legacy DB (merge logic obsolete; 2 orphan timesheet rows remain and are skipped with a warning); **the `ticketUrl` unique constraint is restored** (live data now has zero duplicates); project **EzOrtho** added to the org seed; verification baseline counts updated.

## Problem Statement

Manager hiện không có công cụ tập trung để theo dõi và đánh giá hiệu suất developer trong team. Dữ liệu effort nằm rải rác trên Jira, timesheet ghi tay trên Excel, KPI cuối năm tính thủ công. Team đã dựng một app tạm (nay là `riskradar`) để thay file Excel, nhưng app này kế thừa nguyên các vấn đề của prototype: developer và project lưu bằng **chuỗi tên tự do** — "Alan", "Weclever", "weClever", "We" — nên:

- Cùng một người/một project xuất hiện dưới nhiều tên khác nhau, không filter/group chính xác được (dữ liệu live có 20 biến thể tên cho ~14 project; từng có một nhân viên bị nhập trùng hai lần — đã dọn tay nhưng còn sót 2 dòng timesheet mồ côi)
- Developer trong Evaluation không liên kết gì với hồ sơ Employee và Project đã có trong hệ thống
- Không kiểm soát được ai được phép nhập liệu cho ai (Manager nhập hộ tất cả)
- Audit log không biết ai là người thực hiện thay đổi
- Team phải duy trì hai hệ thống song song (app tạm + web nội bộ chính)

## Solution

Module **Evaluation** (route `/evaluation`, sidebar "Evaluation") gồm 4 trang: Tickets, Timesheet, Statistics, KPI — xây trên nguyên tắc **mọi developer được đánh giá là một Employee `ACTIVE` có thật trong DB** (FK bắt buộc), mọi project là một Project record có thật (FK bắt buộc).

Quyền theo split ownership: **Employee** tự nhập effort ticket (gồm reopen status) và sharing hours của chính mình; **Manager** đặt KPI target, viết summary comment, quản lý timesheet/holiday, import (file/Jira), và override/sửa/xóa mọi record. Mọi user đăng nhập xem được toàn bộ dữ liệu.

Dữ liệu lịch sử import một lần từ **Postgres live của app legacy `riskradar`** qua kết nối trực tiếp (cutover phần evaluation): seed wipe-reload, chạy lại được nhiều lần cho đến ngày cutover vì team vẫn nhập liệu trên app cũ. Fail-loud khi gặp tên không resolve được, không silent skip (ngoại lệ duy nhất: 2 dòng timesheet mồ côi — xem Data Migration). Sau lần import cuối, **mọi dữ liệu evaluation chỉ nhập ở ai-assistant**; app riskradar không nhận thêm evaluation data (app vẫn có thể chạy tiếp cho tính năng risk-analysis riêng của nó — ngoài phạm vi PRD này).

## User Stories

**Ticket Effort Tracking**

1. As an **Employee**, I want to create an effort ticket for myself by picking a Project from a dropdown, so that my effort is recorded against a real Project instead of a typed name.
2. As an **Employee**, I want to record estimate and actual hours for each phase (investigate, code fix, code review), so that planned vs actual effort can be compared.
3. As an **Employee**, I want to declare the reopen status on my own tickets, so that quality data comes from the person who knows it.
4. As an **Employee**, I want to edit my own tickets after creation, so that I can correct my data entry mistakes.
5. As an **Employee**, I want to be blocked from editing other people's tickets, so that ownership of evaluation data is clear.
6. As a **Manager**, I want to create, edit, and delete any ticket for any EvaluatedDeveloper, so that I can correct or clean up records when needed.
7. As a **Manager**, I want to import tickets in bulk, with phase estimates auto-derived from total effort (20% investigate, 40% code fix, 15% code review), so that historical data migrates with reasonable defaults.
8. As a **System**, I want `ticketUrl` to be unique, so that the same work item cannot be recorded twice — an EvaluationEffortTicket is the single effort record for one work item (live data: zero duplicate ticket URLs across 1,409 rows).
9. As a **User**, I want to filter tickets by month, developer, project, category, and ticket URL keyword, so that I can focus on a specific slice.
10. As a **User**, I want the developer column rendered from the Employee's full name (resolved via FK), so that the same person never appears under two spellings.
11. As a **System**, I want ticket creation to reject an Employee whose status is not `ACTIVE`, so that no new evaluation data accrues to people who left.

**Jira Ticket Import**

12. As a **Manager**, I want to fetch open bugs from Jira and preview them before submitting, so that I can verify data before it enters the system.
13. As a **Manager**, I want Jira assignees matched automatically to Employees via `employee.email`, so that no separate mapping configuration has to be maintained.
14. As a **Manager**, I want rows whose assignee email matches no Employee to be flagged with a warning in the preview, so that I can pick the right Employee manually or skip the row.
15. As a **Manager**, I want Jira project prefixes resolved to real Project records, so that imported tickets land on the correct EvaluationProject.

**Timesheet**

16. As a **Manager**, I want a monthly calendar grid of all `ACTIVE` Employees auto-populated when a new month starts, so that I don't re-enter the roster every month.
17. As a **Manager**, I want to mark each Employee × day cell as full day (`x`), half day (`x/2`), approved leave (`-`), or absent (empty), so that attendance reflects how the team actually works.
18. As a **Manager**, I want to add an Employee who onboards mid-month via a dropdown of Employee records, so that latecomers are included without free-text names.
19. As a **Manager**, I want to define holidays per month, so that non-working days are excluded from calculations.
20. As a **User**, I want to view the timesheet for any month, so that attendance records are transparent.
21. As a **System**, I want working-day aggregations to count `x` as 1, `x/2` as 0.5, and everything else as 0, so that productivity denominators are correct while raw markers are preserved.

**KPI**

22. As a **Manager**, I want to set an EvaluationTarget (productivity tickets/day, reopen target, sharing hours/year) per Employee × Project, so that goals are explicit.
23. As a **Manager**, I want the Title on a KPI row pre-filled from the Employee's current EmployeeLevel (Junior/Senior) as a snapshot, so that end-of-year promotions don't rewrite historical KPI context.
24. As an **Employee**, I want to log my own knowledge sharing hours per month (SharingLog), so that sharing data comes from me, not the Manager.
25. As a **Manager**, I want to record monthly KPI values keyed by year-month, so that next year's data doesn't overwrite this year's.
26. As a **Manager**, I want quality metrics (reopen %, reopen count, totals) per Employee × Project, so that code quality is tracked alongside output.
27. As a **Manager**, I want a summary view of targets vs results across all three dimensions with a comment field, so that I have a holistic year-end picture.
28. As a **User**, I want to view all KPI dashboards, so that performance data is transparent to the whole team.

**Statistics**

29. As a **User**, I want a chart of ticket counts per EvaluatedDeveloper for a chosen month, so that workload distribution is visible.
30. As a **User**, I want efficiency percentages (estimate vs actual per phase) per developer per month, so that estimation accuracy is visible.

**Audit Trail**

31. As a **User**, I want every mutation (ticket, timesheet, KPI) recorded in an append-only audit log, so that evaluation data changes are transparent.
32. As a **User**, I want each audit entry to record the Employee who performed the action (resolved from the logged-in User), so that accountability is real; entries by Users with no Employee record (e.g. Admin) store null performer but still log the action.
33. As a **User**, I want to filter the audit log by month, so that I can review changes for a period.

**Data Migration & Organization**

34. As an **Admin**, I want a re-runnable seed that imports the legacy `riskradar` Postgres database over a direct connection (tickets, timesheet, productivity/sharing/quality KPI), so that the team cuts over with their real, current data — not a stale file snapshot.
35. As an **Admin**, I want the import to resolve legacy first names to Employee records and messy project names to Project records (case/space normalization + explicit alias map), so that historical data lands on real FKs.
36. As an **Admin**, I want the import to fail loudly with a list of unresolvable names instead of silently skipping rows, so that data loss can't go unnoticed — the fix is in the legacy data or the Employee/Project seed, not in the importer.
37. As an **Admin**, I want timesheet rows that reference a legacy employee id with no matching `employees` record (orphans left behind when the duplicate "Ben" record was deleted in the legacy app) skipped with an explicit warning listing each row, so that I can fix them by hand after migration if the days matter.
38. As an **Admin**, I want a real Project named "Other" as a temporary catch-all bucket, so that off-project work keeps a mandatory Project FK.
39. As an **HR/Admin**, I want each Employee to carry an optional EmployeeLevel (`JUNIOR`/`SENIOR`), so that KPI rows can snapshot it.
40. As an **Admin**, I want to re-run the import any time before cutover day (wipe-reload of all `evaluation_*` data), so that the final import captures everything the team entered in the legacy app up to the last day.

## Implementation Decisions

### Domain & schema

- All Evaluation tables use the `evaluation_` prefix; the route is `/evaluation`. "Copilot" naming is banned (collides with the GitHub Copilot AIProvider).
- **EvaluatedDeveloper is a mandatory FK to Employee**; **EvaluationProject is a mandatory FK to Project**. No free-text developer/project columns anywhere. FKs use `restrict` on delete — history is never silently lost.
- The `ACTIVE`-Employee invariant is enforced **at the API layer at write time** (create ticket, assign KPI, add to timesheet, import). The FK guarantees existence only. Employees who become `INACTIVE` keep all historical records; only new records are blocked, and UI dropdowns list `ACTIVE` Employees only.
- Employee gains a nullable `level` enum (`JUNIOR` | `SENIOR`) — EmployeeLevel. Promotions happen end-of-year only. KPI rows store a `title` **copy** taken at creation time, deliberately not a reference, so promotion never rewrites KPI history.
- **`ticketUrl` IS unique** (restored in Revision 2). The earlier evidence for multi-day logging (one ticket logged 4 times) no longer exists in the live data — all 1,409 current tickets have distinct URLs; the team records one EvaluationEffortTicket per work item. The unique constraint is in the schema and create/import validation rejects duplicate URLs. `ticketUrl` stays required.
- Effort ticket: phase efforts are non-null (empty = 0 = "phase not worked"); reopen defaults to 0; **total effort is nullable** (it is a separately declared planned number, not derivable from phases — 0 would be a lie); process date is required (it drives monthly aggregation).
- Timesheet cells store the **raw marker** (`x`, `x/2`, `-`, empty). Aggregation converts `x`→1, `x/2`→0.5, anything else→0. No information from the source data is destroyed.
- KPI monthly values are keyed `YYYY-MM` (not bare month names) so multi-year data cannot collide. One KPI row per Employee × Project per table (unique constraint).
- Audit log: append-only; action enum covers ticket CRUD/import, timesheet updates, holiday setting, and KPI create/update. `performedBy` is the Employee resolved from the logged-in User (null when the User has no Employee record). The audited subject Employee is a nullable FK.
- The ai-assistant database may be **dropped and reseeded from scratch** for this change (user decision) — schema changes (e.g. the `ticketUrl` unique constraint) do not need an in-place migration path.

### Permissions

- Ticket create/update: any authenticated Employee for **their own** records (resolved via their User → Employee link); Manager for anyone. Ticket delete: Manager only.
- KPI targets, summary comments, timesheet cells/holidays, imports: Manager only. SharingLog monthly values: the owning Employee or Manager.
- All read endpoints: any authenticated user.

### Jira import

- Assignee → Employee matching uses `employee.email` exclusively. The `JIRA_DEVELOPERS` environment mapping is removed. Unmatched rows surface as preview warnings for manual Employee selection or skip — never auto-guessed.

### Data migration (legacy `riskradar` Postgres)

- **Source of truth for historical data is the live legacy Postgres** of the `riskradar` app (formerly `copilot_statistic`): database **`riskradar`** at **`172.76.10.246:5432`**. The old location (`timesheet_db` @ 172.76.10.210) is obsolete, as are the Excel workbook and the JSON exports.
- The import connects directly over a second connection configured by `LEGACY_EVALUATION_DATABASE_URL` (e.g. `postgresql://aiassistant:…@172.76.10.246:5432/riskradar`); no intermediate dump files. It is a **wipe-reload**: each run clears all `evaluation_*` data and re-imports, so it can be repeated until cutover day. On cutover day: run the final import, verify row counts against the source, then stop entering evaluation data in the legacy app.
- **Scope**: legacy `copilot_evaluation` → effort tickets; legacy `timesheet` → timesheet entries; legacy `productivity_kpi` / `sharing_kpi` / `quality_kpi` → KPI rows. Excluded because the live data is empty or junk: legacy `summary_kpi` (4 rows, all-null metric values), `timesheet_holidays` (empty), `wiki_entries` (now empty). Excluded by scope decision: `issue_management` (2 live rows — belongs to the legacy app), the legacy app's own `audit_log`, and **all risk-analysis data** — the `risk`/`riskreason` columns on `copilot_evaluation` (filled on ~95% of rows) and the `ai_analysis` (12,575 rows), `risk_predictions` (12,574), `requirements` (1,353), `execution_metrics`, `app_settings` tables. Risk analysis is the riskradar app's own domain and stays with it.
- Name resolution reuses the existing import-mapping module: developer first name ↔ first token of `employee.fullName`, case-insensitive; project names normalized by lowercase + space-stripping plus the explicit alias map (`We` → WeClever); unresolvable names abort the import with a full list. All 22 distinct developer names (including **Nolan**, added 2026-06-03) and all 20 project-name variants in the live data resolve against the current seeds — verified 2026-06-12. **EzOrtho** is a real project (confirmed) and is added to the org seed.
- The legacy `timesheet` and KPI tables reference employees by **`employee_id` FK** (not free-text name); the importer joins through the legacy `employees` table to get the name, then resolves it to a real Employee.
- **Orphan timesheet rows**: the duplicate "Ben" employee record was deleted in the legacy app (the `employees` table now holds 22 distinct real people), but 2 timesheet rows still reference the deleted id 22. These are the **single sanctioned exception to fail-loud**: the importer skips them with an explicit warning listing each row, and they can be re-entered by hand after migration if needed. The duplicate-identity merge logic from Revision 1 is obsolete and removed.
- **KPI row folding**: the legacy KPI tables store one aggregate row per employee (`month = null`, carrying the yearly target and sometimes a result) plus one row per month (carrying that month's result). These fold into the new shape: aggregate row → `target`/`result`, monthly rows → `monthlyValues[YYYY-MM]`. The KPI row's Project comes from the legacy employee's project field (resolved via the alias map); `title` snapshots the legacy Junior/Senior value. Quality-specific fields with no legacy counterpart (reopen count/percent, totals) import as null.
- Category mapping is case-insensitive: `bug`/`Bug` stays bug; everything else — feature, Improvement, new development, and the `Task`/`task` values that appeared in live data (22 rows) — maps to feature. Reopen-status parsing (`'0'`/`'1'`/null → integer, null → 0) is unchanged; the live data contains no values outside what the existing helpers handle.
- Every live ticket row has a process date, ticket URL, project, and total effort (zero nulls across 1,409 rows), so the date-inheritance rule from the Excel era has no inputs — it applies only if future sources reintroduce gaps.
- Canonical Project records (including "Other", "EzOrtho", and the Xmaru/Clever families) are created by the org seed; the Evaluation import never creates Projects implicitly.

### Module structure

- A pure **import-mapping module** encapsulates: developer-name resolution, project normalization/aliasing, timesheet marker conversion, month-key handling, the empty-cell rules, and KPI row folding. It is shared by the legacy-DB seed and the Jira import preview, and is the designated deep module of this feature. The duplicate-identity merge helper (`mergeDuplicateTimesheetEntries`) lost its caller with the Ben cleanup and is deleted along with its tests.
- The legacy-DB seed is a thin orchestrator: connect → select per table → run mapping → batch insert → report counts.
- Excel-specific plumbing (workbook reading, sheet column layouts, month-column offsets) is deleted along with the Excel seed; mapping helpers with no remaining callers go with it.
- API routers (ticket, timesheet, kpi, jira, audit) share a small audit-write helper that resolves `performedBy` from the request context.

## Testing Decisions

- A good test exercises **external behavior only**: given raw legacy-shaped inputs, assert the resolved/normalized outputs; never assert on internal lookup structures or call order.
- **Tested module: the import-mapping module** (carried over — the single highest-value target since all dirty data flows through it). Existing cases stay: first-name resolution incl. unmatched/ambiguous failure lists, project alias/case/space normalization, marker conversion (`x`/`x/2`/`-`/empty/junk), `YYYY-MM` key generation, the empty-cell rules (effort→0, total→null, reopen→0), and KPI row folding (aggregate row + monthly rows → target/monthlyValues, missing months, null results). The duplicate-identity merge cases are deleted together with the helper.
- API permission rules, the end-to-end legacy-DB seed (requires a live connection), and web components are explicitly **not** covered by tests in this phase.
- Prior art: the import-mapping module already has its test suite (the backend's first), runnable under the server's Bun runtime; new cases extend that file's patterns.

## Out of Scope

- **Risk-analysis data and features** — the riskradar app's `risk`/`riskreason` ticket columns and its `ai_analysis`, `risk_predictions`, `requirements`, `execution_metrics` tables are its own domain. The cutover moves evaluation data only; risk analysis stays in (and with) the legacy app.
- **Recurring Jira sync** — only the manual fetch-preview-submit flow ships; scheduled/automatic sync is a later phase.
- **Importing `wiki_entries` and `issue_management`** from the legacy app (`wiki_entries` is now empty anyway; `issue_management` has 2 live rows) — if ever needed, they get their own phase with their own entities (the hand-written legacy wiki must not be mixed into the LLM-owned **WikiPage**).
- **Importing the legacy app's audit log** — it is the history of the old tool, not of this module.
- **Holiday import** — the legacy holidays table is empty; Managers set holidays manually after migration.
- **Ongoing sync with the legacy app** — this is a one-way, one-time cutover for evaluation data; no dual-write or scheduled pull. After cutover, evaluation data is entered **only** in ai-assistant.
- **Project-scoped visibility** — everyone sees all Evaluation data; per-Project permissions are a later phase.
- **Multi-year UI** — the schema supports it (`YYYY-MM` keys), but the UI targets the current year only.
- **Promotion workflow** — EmployeeLevel is edited like any Employee field; no approval flow.
- **Retiring the "Other" project** — it is an acknowledged temporary bucket; replacing it with real Projects is future cleanup.

## Further Notes

- `CONTEXT.md` was updated live during the grill sessions and is authoritative for terminology; this PRD intentionally repeats none of the glossary definitions.
- Live legacy data profile at the third grill session (2026-06-12): **1,409 effort tickets** (process dates 2026-04-01 → 2026-06-12), **2,060 timesheet entries** (2026-01 → 2026-06), **22 employee records** (22 real people — the Ben duplicate was deleted upstream; Nolan joined 2026-06-03), **72 / 55 / 39** productivity/sharing/quality KPI rows (21/21/22 aggregate rows + monthly rows). These counts are the verification baseline for the cutover import. Data quality improved markedly over the Revision-1 snapshot: zero nulls in process date, ticket URL, project, and total effort; zero duplicate ticket URLs.
- The live legacy schema **now includes risk columns** (`risk`, `riskreason` on `copilot_evaluation`) — the Revision-1 note that it had none is outdated. The importer selects only the evaluation columns and ignores risk data by design.
- A profiling script ([apps/server/scripts/inspect-legacy-db.ts](../../apps/server/scripts/inspect-legacy-db.ts)) reproduces the data profile above against the live DB; re-run it before the final cutover import to refresh the baseline.
- The team keeps entering data in the legacy app until cutover day, which is why the import must stay re-runnable; the final run happens immediately before the team stops using the legacy app for evaluation entry.
