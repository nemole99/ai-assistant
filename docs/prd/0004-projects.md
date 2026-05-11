# Projects & Project Membership

## Problem Statement

Hiện tại, hệ thống quản lý nhân sự theo Department (phòng ban) nhưng không có khái niệm Project. Các Employee không có nơi để được nhóm lại theo dự án mà họ đang thực thi. Điều này gây khó khăn khi:

- Admin không thể biết ai đang làm dự án nào
- Không có nền tảng để sau này hỗ trợ upload tài liệu tri thức theo dự án
- Manager không có phạm vi rõ ràng để duyệt tài liệu của dự án mình phụ trách

## Solution

Thêm module Project vào hệ thống: Admin tạo Project, gán một Employee làm manager, và kéo các Employee vào project. Mỗi project có trạng thái (`ACTIVE` hoặc `COMPLETED`). Manager và Admin có thể xem danh sách member của project. Đây là nền tảng cho tính năng upload tài liệu tri thức dự án ở phase sau.

## User Stories

1. As an Admin, I want to create a Project with a name and description, so that I can track which employees are working on it.
2. As an Admin, I want to set a status (`ACTIVE` or `COMPLETED`) on a Project, so that I can distinguish active work from finished work.
3. As an Admin, I want to assign an Employee as the manager of a Project, so that there is a clear owner responsible for reviewing documents later.
4. As an Admin, I want the Project manager to automatically become a Project member, so that I don't need to add them twice.
5. As an Admin, I want to add one or more Employees to a Project, so that I can define who is participating.
6. As an Admin, I want to remove an Employee from a Project, so that I can keep membership accurate when someone leaves a project.
7. As an Admin, I want to see a list of all Projects with their status, manager, and member count, so that I have an overview of all ongoing and completed projects.
8. As an Admin, I want to edit a Project's name, description, status, and manager, so that I can keep project information up to date.
9. As an Admin, I want to delete a Project, so that I can remove projects that were created by mistake.
10. As an Admin, I want to see the list of members inside a Project, so that I know who is participating.
11. As a Manager or Admin, I want to view a Project and its members, so that I can understand the team composition.
12. As an Employee, I want to see which Projects I am a member of, so that I know my current project assignments.
13. As an Admin, I want to bulk-remove multiple Employees from a Project, so that I can quickly update membership.
14. As an Admin, I want to see which Projects an Employee belongs to on their profile, so that I can understand their current workload.
15. As an Admin, I want to prevent duplicate membership (same Employee added to the same Project twice), so that the data stays clean.
16. As an Admin, I want the system to prevent me from assigning a manager who is not an active Employee, so that I don't create invalid data.
17. As a Manager, I want to view the Projects where I am the assigned manager, so that I know which projects I am responsible for.

## Implementation Decisions

### Schema Changes

Two new tables:

**`project`**

- `id` — uuid primary key, auto-generated
- `name` — text, not null
- `description` — text, nullable
- `status` — enum(`ACTIVE`, `COMPLETED`), default `ACTIVE`, not null
- `managerId` — FK → employee.id, nullable, set null on delete
- `createdAt`, `updatedAt` — timestamps

**`project_member`**

- `id` — uuid primary key, auto-generated
- `projectId` — FK → project.id, not null, cascade delete
- `employeeId` — FK → employee.id, not null, cascade delete
- `createdAt` — timestamp
- Unique constraint on `(projectId, employeeId)`

### Authorization

- `project.list` — `managerProcedure` (ADMIN + MANAGER)
- `project.get` — `managerProcedure`
- `project.create` — `adminProcedure`
- `project.update` — `adminProcedure`
- `project.delete` — `adminProcedure`
- `project.listMembers` — `managerProcedure`
- `project.addMember` — `adminProcedure`
- `project.removeMember` — `adminProcedure`
- `project.bulkRemoveMembers` — `adminProcedure`
- `project.getSelfProjects` — `protectedProcedure` (employee xem project của mình)

### Business Rules

- Khi ADMIN gán `managerId` khi tạo hoặc cập nhật Project, hệ thống tự động thêm manager vào `project_member` nếu chưa có.
- Khi `managerId` thay đổi sang người khác, manager cũ **không** bị xóa khỏi `project_member` — họ vẫn là member trừ khi Admin xóa thủ công.
- Xóa Project sẽ cascade xóa toàn bộ `project_member` liên quan.
- `project.delete` chỉ xóa được nếu không có ràng buộc phía tài liệu (phase 2) — hiện tại không có ràng buộc.

### API Module: `projectRouter`

Thêm router mới `packages/api/src/routers/project.ts`, export và mount vào `appRouter` dưới key `project`.

Procedures:

- `list` → trả về danh sách project kèm `memberCount`, `managerName`
- `get` → trả về project + danh sách member
- `create` → input: `name`, `description?`, `status?`, `managerId?`
- `update` → input: `id` + partial create fields
- `delete` → input: `id`
- `listMembers` → input: `projectId`, trả về Employee list
- `addMember` → input: `projectId`, `employeeId`
- `removeMember` → input: `projectId`, `employeeId`
- `bulkRemoveMembers` → input: `projectId`, `employeeIds[]`
- `getSelfProjects` → trả về các project mà Employee đang đăng nhập là member

### Frontend Feature: `features/projects/`

Theo pattern hiện tại (`features/departments/`):

- `index.tsx` — trang danh sách Project (hiển thị dạng grid chứa các Project Card, tương tự Department)
- `[projectId].tsx` — trang chi tiết Project (sử dụng Tabs để chia view: tab "Project" chứa thông tin chung/tài liệu, tab "Members" chứa danh sách thành viên)
- `data/schema.ts` — TypeScript types từ API
- `components/`:
  - `project-card.tsx` — hiển thị thông tin summary trên trang danh sách
  - `projects-dialogs.tsx`
  - `projects-action-dialog.tsx` — form tạo/sửa project (TanStack Form)
  - `projects-delete-dialog.tsx`
  - `projects-provider.tsx`
  - `project-members-table.tsx`
  - `project-add-member-dialog.tsx`
  - `project-remove-member-dialog.tsx`

Route: `_authenticated/projects/` (index) và `_authenticated/projects/$projectId/` (detail)

Sử dụng TanStack Form cho các form tạo/sửa (chuẩn của project). Error handling qua `ORPCError` + `sonner` toast.

## Testing Decisions

- Các test tốt chỉ kiểm tra **hành vi bên ngoài** (output từ procedure call), không test implementation detail (query nội bộ, helper function).
- **Không** test UI component riêng lẻ — test qua behavior (dialog open/close, form submit).
- Module cần test: `projectRouter` procedures (đặc biệt business rule tự động thêm manager vào member, unique constraint, cascade delete).
- Prior art: các test hiện tại trong `apps/web/src/components/` (e.g. `confirm-dialog.test.tsx`, `config-drawer.test.tsx`) làm mẫu cho component test nếu cần.

## Out of Scope

- **Document upload và approval workflow** — phase 2 riêng (xem Further Notes)
- Project có `startDate` / `endDate` — không trong scope này
- Project hierarchy (sub-project) — ngoài scope
- Notification khi được thêm vào project
- Multi-tenancy

## Further Notes

PRD này là nền tảng cho PRD tiếp theo về **Document Upload & Approval**: khi Project + ProjectMember đã có, phase 2 sẽ cho phép ProjectMember upload tài liệu tri thức vào project (`ACTIVE` only), và manager của project duyệt (`PENDING → APPROVED | REJECTED`). Phase 2 cần thêm bảng `document`, tích hợp file storage, và approval workflow.
