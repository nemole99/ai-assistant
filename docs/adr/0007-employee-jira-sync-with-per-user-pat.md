# Employee Jira Sync với Personal Access Token per-User

Module **Evaluation** cho phép **Employee tự đồng bộ** ticket đã resolve của chính mình từ Jira (`https://vts.vatech.com`, hardcode) vào `evaluation_ticket`, thay cho tích hợp Jira cũ (Manager fetch open bug bằng server-credential). Xác thực bằng **Jira Personal Access Token per-User** lưu encrypted trong bảng riêng `evaluation_jira_config` (FK `userId`, unique); Employee cấu hình một lần tại `/settings/jira`. JQL dùng `currentUser()` nên mọi ticket thuộc về Employee đang đăng nhập — `employeeId` resolve từ User → Employee, không pick assignee (User không có Employee → chặn). Effort lấy từ Jira **Time Spent** đổ vào `totalEffort`; 6 cột phase effort cũ coi là outdated (giữ tạm trong DB, drop sau).

Quyết định này thay đổi mô hình từ "Manager-mediated import bằng credential dùng chung" sang "Employee self-service bằng credential cá nhân", khớp ownership đã chốt trong CONTEXT.md (Employee tự nhập effort ticket của mình).

## Considered Options

- **Lưu PAT per-User trong DB (đã chọn)** — Employee nhập một lần, tái dùng qua nhiều session. Tốn một bảng + migration nhưng UX mượt cho việc sync định kỳ. Shape giống `AIProvider` (credential per-User → external service) nhưng tách bảng riêng vì Jira không phải AI service.
- **Hỏi PAT mỗi lần sync** — không cần storage, bề mặt bảo mật bằng 0, nhưng phiền khi sync thường xuyên. Loại.
- **Giữ tích hợp Jira server-credential cũ (`JIRA_BASE_URL`/`JIRA_TOKEN`/`JIRA_PROJECT`)** — Manager-only, fetch open bug, map assignee qua email. Không khớp use case self-service và credential dùng chung không phản ánh "ai resolve ticket". Đã gỡ router + env vars.

## Consequences

- Gỡ `packages/api/src/routers/evaluation/jira.ts`, mount `jira` trong `evaluation/index.ts`, và env `JIRA_BASE_URL`/`JIRA_TOKEN`/`JIRA_PROJECT` (`packages/env/src/server.ts`). Map `PREFIX_TO_PROJECT` được tái dùng trong router sync mới.
- Audit dùng lại action `IMPORT_TICKET` với `details.source = "jira-sync"` — không thêm enum mới, tránh migration.
- Jira Server/Data Center → xác thực `Authorization: Bearer <pat>` trên `/rest/api/2/search`.
- PAT là secret per-User: cần encrypt at-rest (như `aiProvider.encryptedToken`) và không bao giờ trả PAT thô về client.
