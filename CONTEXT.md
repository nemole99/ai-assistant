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

## Example dialogue

> **Dev:** "Khi tạo nhân viên mới, mình tạo User hay Employee trước?"
> **HR:** "Tạo **Employee** trước — hồ sơ nhân sự. Sau đó mới tạo **User** account để họ đăng nhập."

> **Dev:** "Manager của department có phải có role MANAGER không?"
> **Domain expert:** "Không nhất thiết — `managerId` chỉ trỏ vào Employee. Role kiểm soát quyền trong app, còn ai là manager của department là dữ liệu tổ chức."

## Flagged ambiguities

- "Account" được dùng lẫn lộn với User và Employee — đã resolve: dùng **User** cho tài khoản đăng nhập, **Employee** cho hồ sơ nhân sự.
