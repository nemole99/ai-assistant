# Internal Tooling Platform

Công cụ nội bộ phục vụ một công ty phần mềm (~50 người), gồm upload tài liệu dự án, chatbot onboarding, chấm công, và tính KPI.

## Language

**User**:
Tài khoản đăng nhập vào hệ thống. Chỉ mang thông tin xác thực (email, password, role).
_Avoid_: Account, Member

**Employee**:
Hồ sơ nhân sự của một thành viên công ty. Chứa thông tin tổ chức (department, position, mã nhân viên). Một Employee có thể liên kết với tối đa một User.
_Avoid_: Staff, Member, User

**Department**:
Đơn vị tổ chức phẳng (flat) trong công ty. Mỗi Department có một Manager (Employee) phụ trách.
_Avoid_: Team, Group, Division

**Role**:
Vai trò cố định gán trên User, kiểm soát quyền trong hệ thống. Có 3 giá trị: `ADMIN`, `MANAGER`, `EMPLOYEE`.
_Avoid_: Permission, Access Level

## Relationships

- Một **User** có đúng một **Role**
- Một **Employee** liên kết với tối đa một **User** (qua `userId`, nullable)
- Một **Employee** thuộc đúng một **Department** (qua `departmentId`)
- Một **Department** có tối đa một **Manager** (Employee, qua `managerId`, nullable)
- **Admin** là User với role `ADMIN`, không nhất thiết phải có Employee record
- Một **User** có thể có nhiều **AIProvider** (tối đa 1 per provider type)
- Một **AIModelAssignment** liên kết với đúng một **User** và một **AIProvider** (tối đa 1 per ModelPurpose)

## Example dialogue

> **Dev:** "Khi tạo nhân viên mới, mình tạo User hay Employee trước?"
> **HR:** "Tạo **Employee** trước — hồ sơ nhân sự. Sau đó mới tạo **User** account để họ đăng nhập."

> **Dev:** "Manager của department có phải có role MANAGER không?"
> **Domain expert:** "Không nhất thiết — `managerId` chỉ trỏ vào Employee. Role kiểm soát quyền trong app, còn ai là manager của department là dữ liệu tổ chức."

**AIProvider**:
Credential của một User với một AI service bên ngoài (phân loại là User Provider, ví dụ: GitHub Copilot, OpenAI). Lưu encrypted token/API key. Mỗi User có tối đa một AIProvider per provider type. Hệ thống cũng hỗ trợ **System Provider** (như Ollama) được cấu hình toàn cục qua biến môi trường (DevOps config, ví dụ: `OLLAMA_BASE_URL`), không có giao diện Web Admin và không cần record AIProvider trong DB.
_Avoid_: Integration, Connection, Account

**AIModelAssignment**:
Mapping từ một mục đích AI (`chat`, `embedding`, `vision`) tới một model cụ thể. Có thể liên kết với một **AIProvider** của User (nếu là User Provider) hoặc không liên kết provider nào (nếu dùng System Provider như Ollama). Mỗi User có tối đa một AIModelAssignment per purpose.
_Avoid_: ModelConfig, ModelPreference

**ModelPurpose**:
Mục đích sử dụng model AI. Có 3 giá trị: `chat`, `embedding`, `vision`.
_Avoid_: ModelType, ModelRole

## Relationships

- Một **User** có thể có nhiều **AIProvider** (tối đa 1 per provider type)
- Một **AIProvider** liên kết với đúng một **User**
- Một **AIModelAssignment** liên kết với đúng một **User** và **có thể** liên kết với một **AIProvider** (nullable khi đó là System Provider)
- Một **User** có tối đa một **AIModelAssignment** per **ModelPurpose**

**Project**:
Một dự án phần mềm cụ thể mà công ty đang hoặc đã triển khai. Có trạng thái (`ACTIVE` hoặc `COMPLETED`) và một Employee phụ trách (manager). Employee có thể tham gia nhiều Project cùng lúc.
_Avoid_: Workspace, Group, Team

**ProjectMember**:
Quan hệ giữa một Employee và một Project. Lưu thông tin tham gia của Employee vào Project. Manager của Project tự động là ProjectMember.
_Avoid_: ProjectParticipant, ProjectEmployee

**ProjectStatus**:
Trạng thái của một Project. Có 2 giá trị: `ACTIVE` (đang hoạt động) và `COMPLETED` (đã hoàn thành). Project `COMPLETED` là read-only — không upload tài liệu mới.
_Avoid_: ProjectState

## Relationships

- Một **Project** có tối đa một **Manager** (Employee, qua `managerId`, nullable)
- Một **Project** có nhiều **ProjectMember** (many-to-many qua bảng trung gian)
- Một **Employee** có thể là **ProjectMember** của nhiều **Project**
- **Manager** của Project tự động là **ProjectMember** của Project đó
- Chỉ **ADMIN** tạo/sửa/xóa **Project** và quản lý **ProjectMember**

**Document**:
Tài liệu được upload vào hệ thống (giai đoạn 1: chỉ PDF). Có thể là global (company-wide, `projectId` = null) hoặc thuộc một Project cụ thể. File gốc lưu trên MinIO, nội dung markdown (sau convert) lưu trong Postgres. Chỉ ADMIN được upload/xóa. Employee xem markdown trên web hoặc download PDF gốc qua presigned URL.
_Avoid_: File, Attachment, Asset

**DocumentCategory**:
Phân loại tài liệu do Admin quản lý (tạo/sửa/xóa). Mỗi category có tên, màu (hex color), và mô tả tùy chọn. Không thể xóa category đang có Document.
_Avoid_: Tag, Label, Folder

**DocumentStatus**:
Trạng thái xử lý của một Document, bao gồm cả markdown conversion và wiki ingestion pipeline. Có 6 giá trị:

- `PENDING` — đang chờ convert markdown
- `FAILED` — convert lỗi, Admin có thể retry (→ `PENDING`) hoặc xóa
- `COMPLETED` — markdown ready, pipeline tự động trigger (transient nếu SystemAIConfig đã cấu hình)
- `INGESTING` — IngestionPipeline đang chạy (EXTRACT → PLAN → COMMIT)
- `INGESTED` — WikiPage đã tạo/cập nhật xong, final success state
- `INGEST_FAILED` — pipeline lỗi (LLM error, timeout), Admin có thể retry (→ `INGESTING`) hoặc xóa
  Nếu SystemAIConfig chưa cấu hình, Document dừng ở `COMPLETED`. Employee thấy Document khi status `COMPLETED` trở lên (trừ `FAILED` / `INGEST_FAILED`).
  _Avoid_: DocumentState, ProcessingStatus

## Relationships

- Một **Document** thuộc đúng một **DocumentCategory** (qua `categoryId`, required)
- Một **Document** có thể thuộc một **Project** (qua `projectId`, nullable) — null nghĩa là global (company-wide)
- Một **DocumentCategory** có nhiều **Document**
- Chỉ **ADMIN** upload/xóa **Document** và CRUD **DocumentCategory**
- Mọi **Employee** (có User account) đều thấy Document global
- **Project** `COMPLETED` không cho upload Document mới

## Example dialogue

> **Dev:** "Document global khác document thuộc project thế nào?"
> **Domain expert:** "Hiện tại mọi Employee đều thấy tất cả Document (cả global lẫn project-scoped). Phân quyền theo Project sẽ làm ở phase sau."

> **Dev:** "Khi upload PDF, Employee thấy ngay không?"
> **Domain expert:** "Không ngay — file vào queue convert sang markdown trước. Khi status = COMPLETED thì Employee mới thấy và đọc được."

**TicketDescriptionGenerator**:
Tính năng trong Ask AI cho phép Employee nhập mô tả thô và nhận lại một ticket description đã được AI format theo bảng nội bộ (Background / Purpose / Process / Considerable factors / Resulting Image). Output là text thuần để paste vào Jira — không lưu vào DB, không tạo entity mới. Entry point là suggestion chip trên Ask AI page, mở dialog nhỏ với 1 textarea. Output stream vào conversation như message thường, kèm nút Copy.
_Avoid_: TicketCreator, TaskGenerator (dễ nhầm là tạo task trong hệ thống)

**Ticket**:
Task được assign trong Jira — công cụ quản lý công việc bên ngoài hệ thống này. Hệ thống không lưu Ticket; chỉ gen ra description text để Employee paste vào Jira.
_Avoid_: Task, Issue (trong context nội bộ)

**WikiPage**:
Bài viết markdown do LLM tạo và duy trì. Tổng hợp kiến thức từ một hoặc nhiều Document. LLM sở hữu toàn bộ nội dung — tạo mới, cập nhật khi có Document mới, duy trì cross-reference giữa các WikiPage. Employee đọc WikiPage để tra cứu kiến thức đã được biên soạn; AI chat tìm kiếm trên WikiPage (không phải raw Document markdown) khi trả lời câu hỏi.
_Avoid_: Article, Post, Note, Document (đã dùng cho raw source)

## Relationships

- Một **WikiPage** có thể được tổng hợp từ nhiều **Document** (many-to-many)
- Một **Document** có thể đóng góp vào nhiều **WikiPage**
- **Document** là immutable source of truth — LLM chỉ đọc, không ghi lại vào Document
- **WikiPage** là mutable — LLM cập nhật khi có Document mới hoặc khi kiến thức cần được reconcile
- **WikiPage** luôn global — mọi Employee (có User account) đều thấy tất cả WikiPage, không phân quyền theo Project

## Example dialogue

> **Dev:** "WikiPage khác Document thế nào?"
> **Domain expert:** "Document là file gốc do human upload (PDF). WikiPage là bài viết do LLM biên soạn từ nhiều Document — đã tổng hợp, cross-reference, và giữ nhất quán. Employee đọc WikiPage để tra cứu nhanh; Document là source of truth nếu cần verify."

**WikiPageChunk**:
Đoạn nhỏ (paragraph/section) được tách ra từ WikiPage, kèm vector embedding. Đơn vị tìm kiếm chính khi AI chat trả lời câu hỏi. Mỗi khi WikiPage được tạo hoặc cập nhật, các chunk cũ bị xóa và tạo lại từ nội dung mới. Lưu trong Postgres với pgvector (`vector` column).
_Avoid_: Fragment, Segment, Block

## Relationships

- Một **WikiPage** có nhiều **WikiPageChunk** (one-to-many, cascade delete)
- Mỗi **WikiPageChunk** thuộc đúng một **WikiPage**
- Khi WikiPage update → xóa chunk cũ → tạo chunk mới → embed lại

**SystemAIConfig**:
Cấu hình AI cấp hệ thống do Admin quản lý qua UI. Singleton per `SystemPurpose`. Lưu provider type, API key (encrypted), model ID. Worker đọc từ DB khi chạy pipeline. Nếu chưa cấu hình, pipeline không chạy (Document dừng ở `COMPLETED`, không tạo WikiPage). Không liên kết User — tách biệt hoàn toàn với per-user AIProvider/AIModelAssignment dùng cho chat.
_Avoid_: AIProvider (đã dùng cho per-user), PipelineConfig (implementation detail)

**SystemPurpose**:
Mục đích sử dụng của SystemAIConfig. Có 2 giá trị: `pipeline_text` (LLM cho extraction/planning/writing trong IngestionPipeline) và `pipeline_embedding` (embedding model cho vector search).
_Avoid_: ModelPurpose (đã dùng cho per-user chat/embedding/vision)

## Relationships

- Một **SystemAIConfig** per **SystemPurpose** (tối đa 2 rows)
- **SystemAIConfig** không liên kết với **User** — Admin CRUD, worker đọc
- **AIProvider** / **AIModelAssignment** vẫn là per-user, dùng cho chat — không thay đổi

**RAGChat**:
Luồng trả lời câu hỏi trong Ask AI, kết hợp vector search trên WikiPageChunk. Mỗi message từ user đều trigger vector search (always-on, không conditional). Top-N chunk được inject vào system prompt làm context. LLM trả lời dựa trên context và cite nguồn — hiển thị tên WikiPage gốc (và Document source nếu có) để user verify. Embedding cho câu hỏi dùng `pipeline_embedding` SystemAIConfig.
_Avoid_: Search, Retrieval (quá chung)

**IngestionPipeline**:
Quy trình tự động biến Document thành WikiPage, gồm 3 phase chạy tuần tự:

1. **EXTRACT** — chunk Document markdown theo section, LLM trích xuất entities/concepts/claims từ mỗi chunk.
2. **PLAN** — LLM so sánh kết quả extract với WikiPage hiện có, quyết định tạo mới hay cập nhật page nào.
3. **COMMIT** — LLM viết/cập nhật WikiPage, tạo embedding cho search.
   Chạy hoàn toàn tự động (không có human review gate). Trigger khi Document status chuyển sang `COMPLETED` (markdown đã convert xong).
   _Avoid_: Workflow, Process (quá chung)

## Deferred scope

- **Jira sync**: Tích hợp Jira (import ticket/bug/task) sẽ làm ở phase sau. Phase 1 chỉ xử lý static documents (file upload).
- **Human review gate**: Cho phép Admin review compilation plan trước khi wiki được cập nhật. Hiện tại pipeline chạy fully automatic.
- **WikiPage revisions**: Lưu lịch sử thay đổi WikiPage. Hiện tại update in place, không giữ snapshot cũ.
- **WikiLink tracking**: Bảng `wiki_link` lưu edge giữa các WikiPage. Hiện tại dùng inline markdown links trong content; có thể parse retroactive nếu cần graph query hoặc backlinks.
- **External vector DB**: Dùng pgvector trong Postgres hiện có, không cần infrastructure riêng.
- **WikiPage categorization**: WikiPage không có category riêng. User tìm WikiPage qua AI chat (vector search), không browse theo category tree.
- **Cascade delete Document → WikiPage**: Xóa Document không ảnh hưởng WikiPage. Kiến thức đã compile vào wiki thì giữ nguyên. Admin muốn xóa WikiPage thì xóa thủ công.
- **Browsable wiki page**: Route `/wiki` để browse danh sách WikiPage. Build sau — phase 1 tập trung vào citations trong Ask AI chat + click citation để xem full WikiPage.
- **Admin edit WikiPage**: Admin không edit nội dung WikiPage — LLM sở hữu toàn bộ content. Admin chỉ có quyền delete. Nếu nội dung sai, xóa WikiPage + sửa/xóa source Document + re-upload.
- **Project-scoped Document visibility**: Hiện tại mọi Employee thấy tất cả Document. Phân quyền Document theo ProjectMember sẽ build ở phase sau.

## Flagged ambiguities

- "Account" được dùng lẫn lộn với User và Employee — đã resolve: dùng **User** cho tài khoản đăng nhập, **Employee** cho hồ sơ nhân sự.
- "Connect GitHub" — không phải đăng nhập bằng GitHub (không thay OAuth login). Là liên kết GitHub account để lấy Copilot API access. Dùng **GitHub Device Flow**, không phải OAuth redirect.
- "Active provider" — không có khái niệm 1 provider active toàn cục. Thay vào đó là **AIModelAssignment**: mỗi purpose (chat/embedding/vision) chỉ ra provider + model đang được dùng. System Model list (như Ollama) được fetch dynamic từ server API, không hardcode. `modelId` string được namespace (ví dụ: `ollama:llama3`, `copilot:gpt-4o`) để tự định tuyến đúng provider. Backend trả về một list model tổng hợp (server-side aggregation) để UI dễ dàng render.
