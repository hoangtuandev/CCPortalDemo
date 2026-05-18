# 01. Mô tả chức năng — CC Portal

**Phiên bản:** rev 2 — rescope V1 thuần về login + quản lý user/role; các tính năng mini-app chuyển sang V1.5+.

## 1. Bối cảnh và mục đích

Công ty chế biến xuất khẩu tôm đông lạnh đang ứng dụng Vibe Coding (lập trình bằng AI) để tự tạo các mini-app phục vụ nghiệp vụ nội bộ: nhập liệu nguyên liệu, báo cáo sản lượng, kiểm tra QC, xem lương, theo dõi đơn hàng...

Các mini-app này là những file web độc lập, viết bằng HTML/JS thuần. Tuy việc tạo ra mỗi app rất nhanh và rẻ, nhưng khi số lượng app tăng lên sẽ phát sinh các vấn đề:
- Nhân viên phải nhớ nhiều đường link
- Không có cơ chế kiểm soát ai được dùng app nào
- Không biết ai đang sử dụng gì tại thời điểm bất kỳ
- Không có nhật ký truy cập cho mục đích audit
- Không có giao diện thống nhất, mỗi app một kiểu

**CC Portal** ra đời để giải quyết những vấn đề này. Đây là một cổng thông tin tập trung đóng vai trò "launcher" — nơi nhân viên đăng nhập một lần và thấy danh sách các mini-app họ được phép sử dụng.

Tuy nhiên, để tránh build quá lớn ngay lần đầu, sản phẩm được chia làm 2 chặng:

| Chặng | Phạm vi | Mục tiêu |
|---|---|---|
| **V1** (tài liệu này) | Login + quản lý user/role + admin UI cơ bản | Có nền tảng auth chắc chắn, đào tạo người dùng, kiểm thử quy trình admin |
| V1.5+ | Mini-app launcher + Storage API + online tracking | Bắt đầu dùng mini-app thực tế |

V1 **không** bao gồm:
- Đăng ký mini-app
- Phân quyền theo app
- Storage API cho mini-app
- Theo dõi user online real-time

Lý do tách: V1 phải chạy ổn định trong môi trường thật trước khi bổ sung tính năng phức tạp hơn. Schema database và mô hình role được thiết kế **chuẩn bị sẵn cho V1.5+** để không phải breaking-change.

## 2. Triết lý sản phẩm

CC Portal được thiết kế theo 5 nguyên tắc cốt lõi:

**Nguyên tắc 1: Portal là launcher, không phải là hệ thống nghiệp vụ.** Portal chỉ làm các việc xoay quanh việc dẫn đường: xác thực, phân quyền, dẫn đường, ghi nhận hoạt động. Logic nghiệp vụ thuộc về mini-app (V1.5+).

**Nguyên tắc 2: Gọn, nhẹ, dễ triển khai.** Portal phải luôn nhanh khi mở. Tránh đưa vào những tính năng "có cũng được" làm phình to và phức tạp.

**Nguyên tắc 3: Mini-app độc lập tuyệt đối.** Mỗi mini-app là một folder riêng, có thể được phát triển, cập nhật, xóa độc lập mà không ảnh hưởng đến Portal hay mini-app khác. *(Áp dụng từ V1.5)*

**Nguyên tắc 4: Cấu hình thay vì viết code.** Thêm app, đổi quyền, tạo role đều thực hiện qua giao diện. Không phải sửa code Portal mỗi khi thêm app mới.

**Nguyên tắc 5: Phù hợp với Vibe Coding.** Mọi quy chuẩn tích hợp phải đủ đơn giản để AI có thể tự tuân thủ khi viết mini-app mới.

## 3. Phạm vi triển khai

| Khía cạnh | Mô tả |
|---|---|
| Quy mô người dùng | 20-100 user trong giai đoạn V1 |
| Hạ tầng | Server Windows chuyên dụng nội bộ, chạy 24/7 |
| Mạng | LAN nội bộ công ty, không public Internet |
| Số lượng mini-app | 0 trong V1 (V1.5 mới có) |
| Giao thức | HTTPS với self-signed certificate (xem `02-architecture.md` mục 7.4) |

## 4. Đối tượng người dùng

| Nhóm | Đặc điểm | Cách đăng nhập (V1) | Cách đăng nhập (V2) |
|---|---|---|---|
| Quản trị viên (Admin) | Cấu hình toàn bộ hệ thống | Username + password | Username + password |
| Quản lý | Theo dõi, báo cáo (qua mini-app từ V1.5) | Username + password | Username + password |
| Nhân viên văn phòng | Dùng mini-app khác nhau (từ V1.5) | Username + password | Username + password |
| Công nhân xưởng | Chỉ dùng 1-2 app đơn giản (từ V1.5) | Username + password | Scan barcode thẻ nhân viên |

Trong V1, Admin là người tương tác chính với Portal. Các nhóm còn lại chỉ login để chuẩn bị cho V1.5 — sau khi login thấy dashboard chào mừng kèm thông báo "tính năng đang phát triển".

## 5. Các chức năng V1

### 5.1. Đăng nhập và xác thực

**Phương thức:** Username + password

**Yêu cầu password:**
- Tối thiểu 10 ký tự
- Phải có ít nhất 1 chữ và 1 số
- Không trùng với username
- Lưu trữ dạng hash bằng bcryptjs (cost factor 12)

**Quy tắc đăng nhập:**
- Sai 5 lần liên tiếp trong 15 phút → khóa tài khoản tạm thời 15 phút
- Admin có thể mở khóa thủ công sớm hơn
- Mỗi lần đăng nhập (thành công hoặc thất bại) đều được ghi log

**Buộc đổi password lần đầu:**
- Khi admin tạo user, set cờ `must_change_password = true`
- User đăng nhập lần đầu → bị redirect sang trang đổi password trước khi vào dashboard
- Password mới phải khác password tạm

**Session:**
- Idle timeout: 1 giờ không có thao tác (không tính heartbeat — V1 chưa có heartbeat)
- Absolute timeout: 8 giờ kể từ lúc đăng nhập
- Cookie session: `httpOnly=true`, `SameSite=Strict`, `Secure=true` (HTTPS)

### 5.2. Đổi mật khẩu

**User tự đổi:**
- Vào trang profile cá nhân
- Nhập password cũ + password mới (2 lần để xác nhận)
- Yêu cầu password mới tuân thủ rule ở mục 5.1
- Sau khi đổi: session hiện tại vẫn dùng được, nhưng các session khác của user này (nếu có) bị invalidate

**Admin reset password:**
- Vào trang quản lý user → chọn user → "Reset password"
- Admin nhập password tạm (tuân thủ rule)
- Hệ thống tự set `must_change_password = true` cho user đó
- Báo password tạm cho user qua kênh ngoài (Zalo, in giấy...)

### 5.3. Dashboard sau đăng nhập

**V1 — dashboard tối giản:**
- Lời chào: "Xin chào, [Họ tên]"
- Vai trò hiện tại
- Thông báo: "Các tính năng ứng dụng đang phát triển. Hiện tại bạn có thể đổi mật khẩu hoặc đăng xuất."
- Link tới: Đổi mật khẩu, Đăng xuất
- Nếu là admin: thêm link "Khu vực quản trị"

Mục đích dashboard V1 đơn giản là để:
- User quen với việc đăng nhập Portal
- Admin có chỗ vào trang quản trị
- Là "khung sườn" sẵn sàng đón mini-app launcher ở V1.5

**V1.5 sẽ thêm:** danh sách mini-app theo quyền của user (xem `04-roadmap-future.md`).

### 5.4. Hệ thống vai trò (Role)

**Mô hình:**
- Mỗi user thuộc đúng **1 role**
- Mỗi role có cờ `is_admin` quyết định có vào khu vực quản trị được không
- Role có thể tự định nghĩa (vd "Admin", "Quản lý", "QC", "Sản xuất", "Công nhân")

**Trong V1:**
- Có thể tạo role với mục đích **chuẩn bị** cho V1.5
- Không có ma trận App × Role (vì chưa có app)
- Cờ `is_admin` là quyền duy nhất phân biệt được giữa role

**Ở V1.5+:** thêm bảng `app_permissions` để cấp quyền dùng mini-app theo role.

### 5.5. Khu vực quản trị (dành cho user có role với `is_admin = true`)

**5.5.1. Tổng quan**
- Tổng số user (đang hoạt động / bị khóa)
- Tổng số role
- Số lần đăng nhập hôm nay (thành công / thất bại)
- 10 sự kiện log gần nhất

**5.5.2. Quản lý tài khoản**

| Chức năng | Mô tả |
|---|---|
| Liệt kê user | Hiển thị tất cả user, lọc theo role và trạng thái |
| Tạo user | Form: username, full_name, password tạm, role, barcode (tùy chọn, dùng cho V2) |
| Sửa user | Đổi full_name, role, barcode |
| Khóa user | Set `is_active = false`, user không đăng nhập được |
| Mở khóa user | Set `is_active = true` |
| Mở khóa tạm thời | Bỏ `locked_until` nếu user bị khóa do nhập sai password |
| Reset password | Set password tạm + `must_change_password = true` |
| Xóa user | **Chỉ khi user chưa có hoạt động nào** (chưa login lần nào). Đã có log → chỉ được khóa, không xóa |

**5.5.3. Quản lý vai trò**

| Chức năng | Mô tả |
|---|---|
| Liệt kê role | Hiển thị tất cả role với số user mỗi role |
| Tạo role | Mã kỹ thuật, tên hiển thị, mô tả, cờ `is_admin` |
| Sửa role | Đổi tên hiển thị, mô tả, cờ `is_admin` (KHÔNG cho đổi mã kỹ thuật) |
| Xóa role | **Chỉ khi không có user nào thuộc role này** |

**Lưu ý:** Phải luôn có ít nhất 1 user `is_admin = true` đang active. Hệ thống chặn thao tác làm vi phạm quy tắc này (vd: không cho khóa admin cuối cùng).

**5.5.4. Nhật ký hoạt động**

Trang xem log với các sự kiện V1:

| Action | Khi nào |
|---|---|
| `login` | Đăng nhập thành công |
| `login_failed` | Đăng nhập thất bại (kèm lý do: sai password, user khóa, tạm khóa) |
| `logout` | Đăng xuất chủ động |
| `session_expired` | Phiên hết hạn |
| `password_changed` | Đổi password (chủ động hoặc bị reset) |
| `admin_user_created` | Admin tạo user |
| `admin_user_modified` | Admin sửa user (đổi role, khóa, mở, v.v.) |
| `admin_role_created` | Tạo role |
| `admin_role_modified` | Sửa role |
| `admin_role_deleted` | Xóa role |

Mỗi log lưu: thời gian, user thực hiện, action, IP, chi tiết (JSON ≤ 1KB).

**Trang log có:**
- Lọc theo username, action, khoảng thời gian
- Sắp xếp mới nhất trên cùng
- Phân trang
- Xuất Excel (xem `04-roadmap-future.md`)

**5.5.5. Cấu hình hệ thống** *(tùy chọn ở V1)*

Một số tham số có thể chỉnh qua UI thay vì code:
- Idle timeout (mặc định 60 phút)
- Absolute session timeout (mặc định 8 giờ)
- Số lần nhập sai trước khi khóa (mặc định 5)
- Thời gian khóa tạm (mặc định 15 phút)

Nếu V1 thấy không gấp → để config trong file, V1.5 thêm UI.

### 5.6. Đăng xuất

- Link đăng xuất trên header ở mọi trang sau khi login
- Click → invalidate session ngay, xóa cookie, redirect về `/login`
- Ghi log `logout`

## 6. Sự khác biệt giữa V1 và V1.5+

### V1 — Nền tảng auth

Như mô tả trong tài liệu này:
- Login/logout với password chuẩn
- Quản lý user và role
- Buộc đổi password lần đầu
- Khóa tài khoản tự động
- Nhật ký auth + admin actions
- Dashboard tối giản

### V1.5 — Thêm mini-app launcher

- Đăng ký mini-app qua giao diện
- Ma trận phân quyền App × Role
- Dashboard hiển thị danh sách mini-app theo quyền
- Mở mini-app trong tab mới
- Portal Bar cho mini-app
- Storage API với schema validation và optimistic concurrency
- Heartbeat + theo dõi user online real-time
- Log thêm `open_app`, `access_denied`, `data_read`, `data_write`

### V2 — Mở rộng

- Mở mini-app trong khung Portal (iframe)
- Đăng nhập bằng scan barcode cho công nhân
- Reverse proxy chặn truy cập trực tiếp file mini-app
- Thông báo real-time tới user đang online
- Xuất log ra Excel
- 2FA cho admin

### V3 — Trưởng thành

- Database tập trung với schema chuẩn cho mọi app
- Báo cáo liên app (truy xuất nguồn gốc)
- Tích hợp với hệ thống ERP/lương
- Mobile-friendly
- Workflow engine

Chi tiết V2/V3 xem `04-roadmap-future.md`.

## 7. Những việc phải làm trước khi đưa V1 vào production

| Việc | Trạng thái | Người chịu trách nhiệm |
|---|---|---|
| Cài đặt server (Windows + Node.js) | Chưa | IT |
| Sinh self-signed certificate cho HTTPS | Chưa | IT |
| Phân phối root CA lên các máy nhân viên | Chưa | IT |
| Thiết lập backup tự động bằng SQLite backup API | Chưa | IT |
| Lập kế hoạch phục hồi khi server hỏng | Chưa | IT + chủ sản phẩm |
| Tạo các role ban đầu (Admin, Quản lý, Nhân viên, Công nhân) | Chưa | Admin |
| Import danh sách user từ HR (nếu có) | Chưa | Admin |
| Đào tạo user về quy trình login + đổi password | Chưa | Admin + HR |
| Đặt domain nội bộ (vd `portal.cc-seafood.local`) | Chưa | IT |
| Quy định chính sách password và session timeout phù hợp công ty | Chưa | Chủ sản phẩm |

## 8. Tiêu chí thành công của V1

V1 được xem là thành công nếu, sau 1-3 tháng triển khai:

1. **100% nhân viên có tài khoản đang active** — không còn ai chưa được setup
2. **Nhân viên đăng nhập được thuận lợi** — tỷ lệ "login_failed do quên password" < 5%/tháng
3. **Không có sự cố mất dữ liệu user** — backup khôi phục được kiểm thử thành công
4. **Admin thao tác nhanh** — tạo user mới, reset password trong < 1 phút
5. **Không có session bị compromise** — không phát hiện đăng nhập bất thường
6. **Sẵn sàng cho V1.5** — kiến trúc database, role không cần breaking-change để thêm tính năng mini-app

## 9. Các quyết định để mở sau (parking lot)

Những câu hỏi chưa quyết, để chốt khi tới gần thời điểm cần:

- **User được phép có nhiều role không?** V1.5+ vẫn 1 user 1 role. Nếu cần nhiều quyền → tạo role gộp. Để mở.
- **Có cần "manager view" để quản lý xem được nhân viên dưới quyền không?** V1 chưa cần (admin xem hết). V2 cân nhắc.
- **Single Sign-On với Active Directory công ty?** V1 không. Khi quy mô tăng và công ty có AD/LDAP sẵn → V2 hoặc V3.
- **Có cần email service không (để gửi password tạm)?** V1 không (gửi qua kênh ngoài). V2 cân nhắc nếu công ty có SMTP nội bộ.
- **Phân quyền chi tiết hơn ngoài `is_admin`?** V1 không cần (chỉ có 2 mức: admin và non-admin). V1.5+ thêm quyền theo app. V3 có thể cần permission chi tiết hơn.
