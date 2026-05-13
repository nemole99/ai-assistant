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

**TicketDescriptionGenerator**:
Tính năng trong Ask AI cho phép Employee nhập mô tả thô và nhận lại một ticket description đã được AI format theo bảng nội bộ (Background / Purpose / Process / Considerable factors / Resulting Image). Output là text thuần để paste vào Jira — không lưu vào DB, không tạo entity mới. Entry point là suggestion chip trên Ask AI page, mở dialog nhỏ với 1 textarea. Output stream vào conversation như message thường, kèm nút Copy.
_Avoid_: TicketCreator, TaskGenerator (dễ nhầm là tạo task trong hệ thống)

**Ticket**:
Task được assign trong Jira — công cụ quản lý công việc bên ngoài hệ thống này. Hệ thống không lưu Ticket; chỉ gen ra description text để Employee paste vào Jira.
_Avoid_: Task, Issue (trong context nội bộ)

## Flagged ambiguities

- "Account" được dùng lẫn lộn với User và Employee — đã resolve: dùng **User** cho tài khoản đăng nhập, **Employee** cho hồ sơ nhân sự.
- "Connect GitHub" — không phải đăng nhập bằng GitHub (không thay OAuth login). Là liên kết GitHub account để lấy Copilot API access. Dùng **GitHub Device Flow**, không phải OAuth redirect.
- "Active provider" — không có khái niệm 1 provider active toàn cục. Thay vào đó là **AIModelAssignment**: mỗi purpose (chat/embedding/vision) chỉ ra provider + model đang được dùng. System Model list (như Ollama) được fetch dynamic từ server API, không hardcode. `modelId` string được namespace (ví dụ: `ollama:llama3`, `copilot:gpt-4o`) để tự định tuyến đúng provider. Backend trả về một list model tổng hợp (server-side aggregation) để UI dễ dàng render.
