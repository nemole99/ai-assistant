# Separated User and Employee models

User (auth) và Employee (hồ sơ nhân sự) được tách thành hai bảng riêng biệt. User chỉ chứa thông tin xác thực và role; Employee chứa thông tin tổ chức và liên kết về User qua `userId` (nullable).

Lý do tách: Admin system account không cần Employee record; Employee có thể tồn tại trước khi có tài khoản đăng nhập (HR tạo hồ sơ trước); Better-Auth quản lý bảng `user` — không nên mix domain data vào đó; permission check chỉ cần session (đã có role) mà không cần join Employee.

Đã xem xét gộp chung (thêm field domain vào bảng `user`), nhưng bị loại vì coupling auth với business logic và không handle được trường hợp Employee chưa có account.
