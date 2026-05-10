# Authentication, Organization & Permissions

## Problem Statement

Nhân viên mới vào công ty mất nhiều thời gian để tìm hiểu quy trình, cấu trúc tổ chức và tài liệu nội bộ. Công ty (~50 người, gồm DEV, QA, HR, Manager) chưa có một nền tảng tập trung để quản lý nhân sự, kiểm soát quyền truy cập theo vai trò, và onboard nhân viên mới một cách có hệ thống.

## Solution

Xây dựng nền tảng internal tooling với một hệ thống xác thực và tổ chức làm nền tảng: Admin tạo hồ sơ Employee, cấp tài khoản đăng nhập với mật khẩu mặc định, và phân quyền theo Role. Từ đó các tính năng khác (upload tài liệu, chatbot onboarding, chấm công, KPI) được xây dựng trên nền này.

## User Stories

1. As an **Admin**, I want to log in with my credentials, so that I can access the management dashboard.
2. As an **Admin**, I want to create a Department with a name and description, so that I can reflect the company's organizational structure.
3. As an **Admin**, I want to assign a Manager (Employee) to a Department, so that reporting chains are clear.
4. As an **Admin**, I want to create an Employee record with employeeCode, fullName, email, position, department, and join date, so that the company roster is tracked.
5. As an **Admin**, I want to create a User account for an existing Employee (with a default password), so that the employee can log in to the system.
6. As an **Admin**, I want the system to flag new accounts with `mustChangePassword`, so that I can later enforce a password change on first login.
7. As an **Admin**, I want to set an Employee's status to INACTIVE, so that departed employees no longer have access.
8. As an **Admin**, I want to update an Employee's position or department, so that the roster stays accurate after internal moves.
9. As an **Admin**, I want the admin account to be bootstrapped from environment variables, so that no credentials are hardcoded in source.
10. As a **Manager**, I want to list all Departments and their employees, so that I can understand the team structure.
11. As a **Manager**, I want to see which Departments I manage, so that I can scope my reporting and KPI views.
12. As an **Employee**, I want to log in with my email and password, so that I can access the platform.
13. As an **Employee**, I want my session to carry my Role, so that the UI can show or hide features based on my permissions.
14. As an **Employee**, I want to be associated with exactly one Department, so that documents and KPI data are correctly scoped.
15. As any **authenticated user**, I want unauthorized routes to return a clear error, so that I understand when I lack access.
16. As an **Admin**, I want the default password to be configurable via environment variable, so that different environments can use different defaults.
17. As an **Admin**, I want the seed script to be idempotent, so that running it multiple times never duplicates the admin account.

## Implementation Decisions

**Single-tenant architecture.** The system serves exactly one company. No multi-tenancy concept is introduced at this phase. All data is implicitly scoped to the one organization.

**Separated User and Employee models.** `User` holds authentication data (email, password hash, role). `Employee` holds organizational data (employeeCode, position, department, join date). An `Employee` links to at most one `User` via a nullable `userId` field. This allows HR to create Employee records before accounts exist, and allows the admin system account to exist without an Employee record.

**Role as a fixed enum on User.** Three roles: `ADMIN`, `MANAGER`, `EMPLOYEE`. Role is stored on the `User` table so it is available in every session without joining the `Employee` table. Each User has exactly one role.

**Department is flat.** No parent-child department hierarchy. A `managerId` (nullable FK → Employee) records who leads each department. This is organizational data, independent of the user's Role.

**Permission middleware layering.**

- `publicProcedure` — no auth required
- `protectedProcedure` — requires valid session
- `managerProcedure` — requires ADMIN or MANAGER role
- `adminProcedure` — requires ADMIN role only

**Employee account creation flow.** Admin first creates an Employee record (no account). Then explicitly calls `employee.createAccount` to provision a User with the default password and `mustChangePassword: true`. The `employee.userId` is set atomically in that same operation.

**Default password via env var.** `DEFAULT_USER_PASSWORD` is read from the environment at account-creation time. Current default for development: `evn@1234`. Not enforced (no redirect) at this phase — the `mustChangePassword` field is in place for future enforcement.

**Admin seed.** Admin account is seeded via `bun src/seed.ts` in the server app. Credentials are driven by `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars. The admin has no Employee record. The script is idempotent: skips if admin already exists.

**DB port.** The workspace PostgreSQL container runs on port `5433` (not `5432`) due to a port conflict with another local service on the developer machine. This is local-only; production is unaffected.

## Testing Decisions

Good tests in this codebase test external behavior only — they call the oRPC procedure handler with a constructed context and assert on the returned value or thrown error, without asserting on internal DB queries or intermediate state.

**Modules to test:**

- **Permission middleware** (`adminProcedure`, `managerProcedure`) — unit test: provide a mock context with different roles and assert `UNAUTHORIZED` / `FORBIDDEN` / success responses. This is the highest-value test since all protected routes rely on it.
- **`employee.createAccount`** — integration test: create an Employee record, call `createAccount`, assert the returned `userId` links back to the Employee and that `role = EMPLOYEE` and `mustChangePassword = true` on the new User.
- **`department.update` with `managerId`** — unit test: assert that only valid Employees can be set as department manager.

No prior test files exist in the codebase — these would be the first tests.

## Out of Scope

- Enforcing `mustChangePassword` on login (redirect to change-password page)
- Password reset / forgot-password flow
- OAuth / social login
- Multi-tenant support
- Nested / hierarchical Departments
- Employee profile photo upload
- Employee PII fields (date of birth, bank account, national ID)
- Frontend UI for Department / Employee management
- Audit log for admin actions

## Further Notes

- The `managerId` on Department creates a soft circular reference (department → employee → department). This is resolved at the Drizzle relations layer using `relationName: "department_manager"` and does not require a deferred FK constraint in Postgres.
- Better-Auth manages the `user` table. Custom fields (`role`, `mustChangePassword`) are declared via `user.additionalFields` in the auth config so they are included in session payloads and type-safe on the client.
- The ADR for the User/Employee separation lives at `docs/adr/0001-separated-user-employee-models.md`.
