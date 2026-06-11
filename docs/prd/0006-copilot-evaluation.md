# Copilot Evaluation — Developer Performance Tracking

## Problem Statement

Manager hiện không có công cụ tập trung để theo dõi và đánh giá hiệu suất làm việc của developer trong team. Dữ liệu effort trên từng ticket nằm rải rác trên Jira, timesheet ghi trên Excel/Google Sheet, KPI đánh giá cuối năm tính thủ công. Không có cách nào để:

- So sánh estimate vs actual effort trên từng phase (investigate, code fix, code review)
- Tính toán efficiency tự động theo tháng
- Theo dõi attendance (ngày công) trực quan
- Quản lý KPI theo 3 chiều: Productivity, Knowledge Sharing, Quality
- Có audit trail cho mọi thay đổi dữ liệu đánh giá

Platform nội bộ cần tính năng này để Manager có dashboard tổng hợp, giảm effort thủ công, và đảm bảo dữ liệu đánh giá minh bạch.

## Solution

Xây dựng module **Copilot Evaluation** — gồm 4 trang chính:

1. **Tickets** — Quản lý effort tracking per ticket (bug/feature) với breakdown 3 phase
2. **Timesheet** — Bảng chấm công tháng (calendar grid) với holiday management
3. **Statistics** — Biểu đồ ticket count và efficiency theo developer
4. **KPI** — Dashboard KPI gồm Productivity, Sharing, Quality, Summary

Manager có full CRUD + import; Employee chỉ xem. Hỗ trợ Jira integration để bulk import tickets. Mọi thay đổi đều được ghi audit log.

## User Stories

**Ticket Effort Tracking (Manager)**

1. As a **Manager**, I want to add a ticket with developer name, project, category (bug/feature), ticket URL, process date, and effort breakdown, so that I can record developer effort systematically.
2. As a **Manager**, I want to specify estimate and actual hours for each phase (investigate, code fix, code review), so that I can compare planned vs actual effort.
3. As a **Manager**, I want to edit any ticket's details after creation, so that I can correct data entry mistakes.
4. As a **Manager**, I want to delete a ticket with confirmation, so that I can remove incorrect entries.
5. As a **Manager**, I want to import tickets in bulk via JSON or CSV file, so that I can migrate historical data efficiently.
6. As a **Manager**, I want the system to auto-calculate estimate ratios from total effort during import (20% investigate, 40% code fix, 15% code review), so that imported data has reasonable default estimates.
7. As a **Manager**, I want duplicate ticket URLs to be rejected on create/import, so that data integrity is maintained.
8. As a **Manager**, I want to filter tickets by month, developer, project, category, and ticket URL keyword, so that I can focus on specific evaluation criteria.

**Jira Integration (Manager)**

9. As a **Manager**, I want to fetch open bugs from Jira automatically, so that I don't need to manually copy ticket data.
10. As a **Manager**, I want Jira tickets to be mapped to developer names via a configurable email→name mapping, so that developers are correctly identified.
11. As a **Manager**, I want to review fetched Jira tickets before submitting them to the system, so that I can verify data accuracy.

**Timesheet Management (Manager)**

12. As a **Manager**, I want to view a calendar grid showing attendance for all employees in a month, so that I have a visual overview of working days.
13. As a **Manager**, I want to toggle attendance for any employee on any day (present/absent), so that I can track daily attendance.
14. As a **Manager**, I want to add employees to the timesheet for a given month, so that new team members are included.
15. As a **Manager**, I want to define holidays for a month, so that non-working days are visually distinguished and excluded from calculations.

**KPI Management (Manager)**

16. As a **Manager**, I want to set productivity targets (tickets/day) per developer per project, so that I can track against goals.
17. As a **Manager**, I want to enter monthly productivity values, so that I can track progress over the year.
18. As a **Manager**, I want to set knowledge sharing targets (hours/year) and track monthly values, so that I can measure team collaboration.
19. As a **Manager**, I want to track quality metrics including reopen rate and total-by-March figures, so that I can evaluate code quality.
20. As a **Manager**, I want a KPI summary view showing targets vs results across all 3 dimensions with comments, so that I have a holistic performance view.
21. As a **Manager**, I want to add comments to KPI summaries, so that I can annotate evaluations with context.

**Viewing & Statistics (All Employees)**

22. As an **Employee**, I want to see the tickets page with filter controls and paginated table, so that I can browse team workload efficiently.
23. As an **Employee**, I want to see a chart of ticket counts per developer for a given month, so that I can visualize workload distribution.
24. As an **Employee**, I want to see efficiency percentages comparing estimate vs actual for each phase, so that I can understand time estimation accuracy.
25. As an **Employee**, I want to view the timesheet calendar for any month, so that I can check attendance records.
26. As an **Employee**, I want to view KPI dashboards (productivity, sharing, quality, summary), so that I can see team performance metrics.

**Audit Trail (All Employees)**

27. As an **Employee**, I want to see an audit log of all ticket modifications (create, update, delete, import), so that data changes are transparent.
28. As an **Employee**, I want to filter audit logs by month, so that I can review changes for a specific period.

## Implementation Decisions

### Database Schema Changes

**8 new tables** under `packages/db/src/schema/copilot-evaluation.ts`:

#### `copilot_ticket`

| Column               | Type                   | Constraints           |
| -------------------- | ---------------------- | --------------------- |
| id                   | text                   | PK                    |
| developer            | text                   | NOT NULL, indexed     |
| project              | text                   | NOT NULL, indexed     |
| category             | enum(`bug`, `feature`) | NOT NULL              |
| ticket_url           | text                   | NOT NULL, UNIQUE      |
| process_date         | date                   | NOT NULL, indexed     |
| total_effort         | real                   | NOT NULL              |
| investigate_estimate | real                   | NOT NULL              |
| investigate_actual   | real                   | NOT NULL              |
| code_fix_estimate    | real                   | NOT NULL              |
| code_fix_actual      | real                   | NOT NULL              |
| code_review_estimate | real                   | NOT NULL              |
| code_review_actual   | real                   | NOT NULL              |
| reopen_status        | integer                | NOT NULL, default 0   |
| comment              | text                   | nullable              |
| created_at           | timestamp              | NOT NULL, default now |
| updated_at           | timestamp              | NOT NULL, auto-update |

#### `copilot_timesheet_entry`

| Column        | Type      | Constraints                          |
| ------------- | --------- | ------------------------------------ |
| id            | text      | PK                                   |
| month         | text      | NOT NULL (format: YYYY-MM), indexed  |
| employee_name | text      | NOT NULL, indexed                    |
| day           | integer   | NOT NULL (1–31)                      |
| value         | text      | NOT NULL, default "" ("x" = present) |
| created_at    | timestamp | NOT NULL, default now                |
| updated_at    | timestamp | NOT NULL, auto-update                |

Unique constraint: `(month, employee_name, day)`

#### `copilot_timesheet_holiday`

| Column     | Type      | Constraints                 |
| ---------- | --------- | --------------------------- |
| id         | text      | PK                          |
| month      | text      | NOT NULL (YYYY-MM), indexed |
| day        | integer   | NOT NULL (1–31)             |
| created_at | timestamp | NOT NULL, default now       |

Unique constraint: `(month, day)`

#### `copilot_kpi_productivity`

| Column         | Type      | Constraints                                 |
| -------------- | --------- | ------------------------------------------- |
| id             | text      | PK                                          |
| developer      | text      | NOT NULL, indexed                           |
| project        | text      | NOT NULL                                    |
| title          | text      | nullable                                    |
| target         | real      | nullable (tickets/day target)               |
| result         | real      | nullable (tickets/day actual)               |
| monthly_values | jsonb     | default {}, stores `Record<string, number>` |
| created_at     | timestamp | NOT NULL, default now                       |
| updated_at     | timestamp | NOT NULL, auto-update                       |

#### `copilot_kpi_sharing`

Same structure as `copilot_kpi_productivity`. Target = hours/year.

#### `copilot_kpi_quality`

| Column         | Type      | Constraints                                 |
| -------------- | --------- | ------------------------------------------- |
| id             | text      | PK                                          |
| developer      | text      | NOT NULL, indexed                           |
| project        | text      | NOT NULL                                    |
| title          | text      | nullable                                    |
| reopen_percent | real      | nullable                                    |
| total_by_mar   | real      | nullable                                    |
| reopen_number  | real      | nullable                                    |
| result         | real      | nullable                                    |
| monthly_values | jsonb     | default {}, stores `Record<string, number>` |
| created_at     | timestamp | NOT NULL, default now                       |
| updated_at     | timestamp | NOT NULL, auto-update                       |

#### `copilot_kpi_summary`

| Column              | Type      | Constraints           |
| ------------------- | --------- | --------------------- |
| id                  | text      | PK                    |
| developer           | text      | NOT NULL, indexed     |
| project             | text      | NOT NULL              |
| title               | text      | nullable              |
| target_productivity | real      | nullable              |
| target_reopen       | real      | nullable              |
| target_sharing      | real      | nullable              |
| result_productivity | real      | nullable              |
| result_reopen       | real      | nullable              |
| result_sharing      | real      | nullable              |
| comment             | text      | nullable              |
| created_at          | timestamp | NOT NULL, default now |
| updated_at          | timestamp | NOT NULL, auto-update |

#### `copilot_audit_log`

| Column       | Type                                                                     | Constraints                                |
| ------------ | ------------------------------------------------------------------------ | ------------------------------------------ |
| id           | text                                                                     | PK                                         |
| action       | enum(`CREATE_TICKET`, `UPDATE_TICKET`, `DELETE_TICKET`, `IMPORT_TICKET`) | NOT NULL, indexed                          |
| developer    | text                                                                     | nullable                                   |
| details      | jsonb                                                                    | nullable, stores `Record<string, unknown>` |
| performed_by | text                                                                     | FK → employee.id, ON DELETE SET NULL       |
| created_at   | timestamp                                                                | NOT NULL, default now, indexed             |

**Enums:**

- `ticket_category`: `bug` | `feature`
- `copilot_audit_action`: `CREATE_TICKET` | `UPDATE_TICKET` | `DELETE_TICKET` | `IMPORT_TICKET`

### Authorization

| Procedure                   | Auth Level           |
| --------------------------- | -------------------- |
| ticket.list                 | `protectedProcedure` |
| ticket.get                  | `protectedProcedure` |
| ticket.listDevelopers       | `protectedProcedure` |
| ticket.listProjects         | `protectedProcedure` |
| ticket.create               | `managerProcedure`   |
| ticket.update               | `managerProcedure`   |
| ticket.delete               | `managerProcedure`   |
| ticket.import               | `managerProcedure`   |
| ticket.chartData            | `protectedProcedure` |
| ticket.efficiencyData       | `protectedProcedure` |
| timesheet.getMonth          | `protectedProcedure` |
| timesheet.listEmployees     | `protectedProcedure` |
| timesheet.addEmployee       | `managerProcedure`   |
| timesheet.updateCell        | `managerProcedure`   |
| timesheet.setHolidays       | `managerProcedure`   |
| kpi.listProductivity        | `protectedProcedure` |
| kpi.createProductivity      | `managerProcedure`   |
| kpi.updateProductivityMonth | `managerProcedure`   |
| kpi.listSharing             | `protectedProcedure` |
| kpi.createSharing           | `managerProcedure`   |
| kpi.updateSharingMonth      | `managerProcedure`   |
| kpi.listQuality             | `protectedProcedure` |
| kpi.createQuality           | `managerProcedure`   |
| kpi.updateQualityMonth      | `managerProcedure`   |
| kpi.updateQualityTotalByMar | `managerProcedure`   |
| kpi.listSummary             | `protectedProcedure` |
| kpi.createSummary           | `managerProcedure`   |
| kpi.updateSummaryComment    | `managerProcedure`   |
| jira.fetchTickets           | `managerProcedure`   |
| jira.submitTickets          | `managerProcedure`   |
| audit.list                  | `protectedProcedure` |

### Business Rules

1. **Ticket URL uniqueness** — Each ticket URL must be globally unique; attempts to create/import duplicates are rejected with a `CONFLICT` error.
2. **Import auto-estimation** — When importing tickets, estimates are auto-calculated as percentages of total effort: 20% investigate, 40% code fix, 15% code review.
3. **Timesheet cell upsert** — Updating a cell that doesn't exist yet creates it; updating an existing cell updates in-place.
4. **Holiday replacement** — Setting holidays for a month replaces all existing holiday entries for that month (delete-then-insert pattern).
5. **KPI monthly_values** — Stored as JSONB with month keys (e.g., `{"jan": 5, "feb": 3}`); updates merge new values into existing JSON.
6. **Audit logging** — Every ticket CREATE, UPDATE, DELETE, and IMPORT operation automatically logs to `copilot_audit_log` with action, developer, and details.
7. **Efficiency calculation** — `((estimate - actual) / estimate) * 100` per phase; positive = under budget, negative = over budget.
8. **Month filtering** — All list operations support YYYY-MM format filtering; date comparisons use `>= first-of-month` and `< first-of-next-month`.
9. **Jira developer mapping** — Environment variable `JIRA_DEVELOPERS` maps email→name as comma-separated `email:Name` pairs.
10. **Past-month editing lock** — Timesheet (`updateCell`, `addEmployee`, `setHolidays`) and KPI (`updateProductivityMonth`, `updateSharingMonth`, `updateQualityMonth`) throw `FORBIDDEN` for months prior to the current month. Only current and future months are editable.
11. **Developer name normalization** — Email addresses in developer field are normalized to capitalized first name (e.g., `buddy.nguyen@ewoosoft.com` → `Buddy`). Applied during seed import and ticket creation.
12. **Project name normalization** — Projects are normalized to a canonical list (15 entries) using ticket URL prefix mapping (`GPMS-*` → CleverDent, `EVNWCL-*` → WeClever, etc.) and case-insensitive aliases. The `listProjects` endpoint returns the canonical list; the `listDevelopers` endpoint returns first names from the `employee` table.
13. **Server-side pagination** — `ticket.list` supports paginated responses with configurable page size (default 10, max 100). Response shape: `{ data, total, page, limit, totalPages }`.
14. **Server-side filtering** — `ticket.list` supports filtering by `developer` (exact), `project` (exact), `category` (exact), and `ticket` (ILIKE text search on ticket URL).

### Environment Variables (Jira Integration)

| Variable          | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| `JIRA_BASE_URL`   | Jira instance base URL (e.g., `https://company.atlassian.net`) |
| `JIRA_TOKEN`      | Bearer token for Jira API authentication                       |
| `JIRA_PROJECT`    | Jira project key to query                                      |
| `JIRA_DEVELOPERS` | Developer mapping: `email1:Name1,email2:Name2`                 |

All 4 variables must be set for Jira integration to function; otherwise a `BAD_REQUEST` error is returned.

### API Module: `copilotEvaluationRouter`

**Location:** `packages/api/src/routers/copilot-evaluation/`

Sub-routers:

- `ticket` — `copilot-evaluation/ticket.ts`
- `timesheet` — `copilot-evaluation/timesheet.ts`
- `kpi` — `copilot-evaluation/kpi.ts`
- `jira` — `copilot-evaluation/jira.ts`
- `audit` — `copilot-evaluation/audit.ts`

**Key procedures:**

| Procedure               | Input                                                                 | Output                                                                 |
| ----------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `ticket.list`           | `{ month?, developer?, project?, category?, ticket?, page?, limit? }` | `{ data: CopilotTicket[], total, page, limit, totalPages }`            |
| `ticket.listDevelopers` | none                                                                  | `string[]` (first names from employee table)                           |
| `ticket.listProjects`   | none                                                                  | `string[]` (canonical project list)                                    |
| `ticket.create`         | Full ticket fields                                                    | `CopilotTicket`                                                        |
| `ticket.import`         | `{ tickets: InsertTicket[] }`                                         | `{ imported: number, errors: string[] }`                               |
| `ticket.chartData`      | `{ month: "YYYY-MM" }`                                                | `{ month, data: { developer, count }[] }`                              |
| `ticket.efficiencyData` | `{ month: "YYYY-MM" }`                                                | `{ month, data: { developer, investigateEff, codeEff, reviewEff }[] }` |
| `timesheet.getMonth`    | `{ month: "YYYY-MM" }`                                                | `{ month, employees: { name, days }[], holidays: number[] }`           |
| `timesheet.updateCell`  | `{ month, employee, day, value }`                                     | `{ success: true }`                                                    |
| `jira.fetchTickets`     | none                                                                  | Jira ticket array (preview)                                            |
| `jira.submitTickets`    | `{ tickets: JiraTicket[] }`                                           | `{ imported, errors }`                                                 |
| `audit.list`            | `{ month?, limit? }`                                                  | `AuditLog[]`                                                           |

### Frontend Feature Layout

**Location:** `apps/web/src/features/copilot-evaluation/`

```
features/copilot-evaluation/
├── index.tsx                          # CopilotEvaluationTickets — main tickets page
├── components/
│   ├── ticket-table.tsx               # DataTable with effort + efficiency columns
│   ├── ticket-form-dialog.tsx         # Add/edit ticket dialog form
│   ├── timesheet-page.tsx             # CopilotEvaluationTimesheet — calendar grid
│   ├── stats-page.tsx                 # CopilotEvaluationStats — charts
│   └── kpi-page.tsx                   # CopilotEvaluationKpi — tabbed KPI dashboard
├── data/
│   └── schema.ts                      # TypeScript types inferred from API responses
└── hooks/
    ├── use-tickets.ts                 # React Query hooks for ticket CRUD
    ├── use-timesheet.ts               # React Query hooks for timesheet
    └── use-kpi.ts                     # React Query hooks for KPI operations
```

**Routes (TanStack Router):**

| Route                           | Component                    |
| ------------------------------- | ---------------------------- |
| `/copilot-evaluation`           | `CopilotEvaluationTickets`   |
| `/copilot-evaluation/timesheet` | `CopilotEvaluationTimesheet` |
| `/copilot-evaluation/stats`     | `CopilotEvaluationStats`     |
| `/copilot-evaluation/kpi`       | `CopilotEvaluationKpi`       |

All routes are under `/_authenticated/` layout (requires login).

**UI Patterns:**

- Month selector (`<Input type="month">`) on every page for period filtering
- **Fixed layout** for Tickets page: header/filters stay at top, table scrolls internally, pagination pinned at bottom (uses `<Main fixed>` with `overflow-hidden`)
- **Filter bar** with 4 controls: Developer (select), Project (select), Category (select: All/Bug/Feature), Ticket (text search input)
- **Pagination** uses shared `DataTablePagination` component (same as Employees page): rows-per-page dropdown (10/20/30/40/50), numbered page buttons with ellipsis, first/prev/next/last navigation
- **Ticket form** (Add/Edit dialog): Vietnamese labels, 2-column layout, Developer/Project as select dropdowns populated from API (`listDevelopers`/`listProjects`), section headers in teal (INVESTIGATE / CODE FIXING / CODE REVIEW), readonly estimate fields showing default ratios (20%/40%/15%)
- DataTable with effort + efficiency columns, sticky header within scrollable area
- Calendar grid (days × employees) for timesheet
- **Statistics charts** (Recharts): BarChart for ticket count per developer (sorted desc, unique color per bar, -35° angled x-axis labels), grouped BarChart for efficiency (3 bars per developer: investigate/code-fix/review, with legend and ReferenceLine at 0%)
- Tabbed interface for KPI (Productivity | Sharing | Quality | Summary)
- Editable cells in KPI tables (inline edit with month-key JSONB updates)
- File import supporting JSON and CSV formats

### Seed Data

**Location:** `apps/server/src/seed/seed-copilot-evaluation.ts`

Imports historical data from `migration-export/` directory:

- `tickets.json` — Historical ticket data
- `timesheet/{month}.json` — Monthly attendance per employee
- `kpi/productivity.json`, `kpi/sharing.json`, `kpi/quality.json`, `kpi/summary.json`

## Testing Decisions

Modules to test:

- `ticket-table.tsx` — Column rendering, efficiency calculations display
- `ticket-form-dialog.tsx` — Form validation, category selection, URL uniqueness feedback
- `timesheet-page.tsx` — Calendar grid rendering, cell toggle interaction
- `kpi-page.tsx` — Tab switching, editable cell behavior, monthly value updates

Use `vitest-browser-react` + Playwright. Prior art: `apps/web/src/components/config-drawer.test.tsx`, `confirm-dialog.test.tsx`.

## Out of Scope

- **Per-employee login scoping** — All employees see all data (no per-user filtering of tickets/KPIs)
- **Automated KPI calculation** — Manager manually enters KPI values; no auto-compute from ticket data
- **Approval workflows** — No formal approval/sign-off process for evaluations
- **Historical comparisons** — No year-over-year or quarter-over-quarter trend analysis
- **Notification system** — No alerts when KPIs are updated or tickets imported
- **Export to PDF/Excel** — Data export functionality is future scope
- **Employee self-reporting** — Only Managers enter data; employees cannot self-report effort

## Further Notes

- **No FK to Employee table** — Tickets reference developers by `text` name, not by FK to `employee.id`. This allows tracking developers who may not yet have system accounts.
- **Jira integration is optional** — The feature works fully without Jira env vars configured; Jira fetch simply returns an error message prompting configuration.
- **JSONB for monthly values** — KPI tables use JSONB columns for flexible month-key storage rather than separate rows per month. This avoids schema changes when tracking periods shift.
- **Audit log is append-only** — No update/delete on audit records; they serve as an immutable trail.
- **Reopen status** — Tracked as integer (0 = not reopened, non-zero = reopen count) on individual tickets and aggregated in KPI quality metrics.
- **Data normalization** — `normalizeDeveloper()` and `normalizeProject()` are applied both at seed time and in the API create/update paths. Canonical project list (15 entries) with prefix-based mapping (`PREFIX_TO_PROJECT`) and case-insensitive aliases (`PROJECT_ALIASES`).
- **CORS in development** — Server accepts any `http://localhost:*` origin in development mode (dynamic regex match). Better-Auth `trustedOrigins` includes `localhost:3001`, `localhost:3002`, `localhost:5173`.
- **TanStack Table for pagination** — Tickets page uses `useReactTable` with `manualPagination: true` to integrate server-side paginated data with the shared `DataTablePagination` component. The table instance provides the pagination state management while `TicketTable` renders the actual data rows independently.
