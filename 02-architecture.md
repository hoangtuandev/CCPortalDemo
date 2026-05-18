# 02. Kiến trúc kỹ thuật — CC Portal

Tài liệu này mô tả kiến trúc kỹ thuật của CC Portal. Đây là tài liệu định hướng — chưa phải tài liệu API chi tiết.

**Phiên bản:** rev 2 — cập nhật endpoint storage có slug, schema validation, optimistic concurrency, CSP.

> **Lưu ý về scope V1:** Theo định hướng hiện tại, **V1 chỉ gồm Portal + đăng nhập + quản lý user/role + admin UI** (chưa có Storage API cho mini-app). Các phần mô tả Storage API, heartbeat, log mini-app... trong tài liệu này thuộc về V1.5/V2. Tuy nhiên thiết kế được mô tả ở đây ngay từ đầu để đảm bảo schema DB và API contract của V1 không phải breaking-change sau này.

## 1. Tổng quan kiến trúc

CC Portal là một ứng dụng web đơn giản chạy trên server Windows nội bộ. Người dùng truy cập qua trình duyệt trong mạng LAN.

```
+----------------------------------+
|  Trình duyệt user (trong LAN)    |
+-----------------+----------------+
                  |
                  | HTTP qua LAN
                  |
+-----------------v----------------+
|  Server Windows nội bộ           |
|  +----------------------------+  |
|  |  CC Portal (Node.js)       |  |
|  |  - Auth, phân quyền        |  |
|  |  - Dashboard, admin UI     |  |
|  |  - Storage API (V1.5+)     |  |
|  |  - Mini-app launcher       |  |
|  +----------------------------+  |
|  |  Database (SQLite)         |  |
|  |  Mini-app files (HTML/JS)  |  |
|  +----------------------------+  |
+----------------------------------+
```

Toàn bộ hệ thống chạy trong **một process duy nhất** trên server, không phụ thuộc Internet, không phụ thuộc dịch vụ ngoài.

## 2. Stack công nghệ được đề xuất

| Tầng | Công nghệ | Lý do chọn |
|---|---|---|
| Backend | Node.js + Express | Chạy tốt trên Windows, AI viết được tốt, nhẹ |
| Database | SQLite | File đơn, không cần cài DB server, backup dễ |
| Session store | SQLite | Tận dụng DB sẵn có, không cần Redis |
| Hash password | bcryptjs (cost 12) | Pure JS, không cần native compile, an toàn |
| Template engine | EJS | Đơn giản, AI hiểu tốt |
| Frontend Portal | HTML + CSS + JS thuần | Tránh build step, đơn giản |
| Mini-app | HTML/JS thuần + CSP | Yêu cầu sản phẩm |
| Icon library | Tabler Icons (CDN) | Miễn phí, đẹp, đầy đủ |

**Lý do chọn Node.js thay vì Python/PHP:**
- Cùng ngôn ngữ với mini-app (JavaScript) — dễ chia sẻ code
- Cài đặt 1 lần qua installer .msi trên Windows
- npm install xong là chạy được, không cần xử lý môi trường phức tạp

## 3. Cấu trúc thư mục

```
cc-portal/
├── portal/                  # Mã nguồn Portal
│   ├── server.js            # Entry point
│   ├── routes/              # Các route xử lý request
│   │   ├── auth.js          # Đăng nhập, đăng xuất
│   │   ├── admin.js         # Trang quản trị
│   │   └── storage.js       # Storage API cho mini-app (V1.5+)
│   ├── middleware/          # Middleware (auth check, logging)
│   ├── views/               # Template EJS
│   ├── public/              # Tài nguyên tĩnh (CSS, JS chung)
│   │   ├── css/
│   │   └── portal-client.js # Thư viện mini-app tích hợp (V1.5+)
│   └── package.json
│
├── apps/                    # Mini-app chính thức (stable) (V1.5+)
│   ├── nhap-lieu-tom/
│   │   └── index.html
│   └── ...
│
├── apps-beta/               # Mini-app thử nghiệm (V1.5+)
│   └── bao-cao-thu-nghiem/
│       └── index.html
│
├── data/                    # Dữ liệu (cần backup)
│   ├── portal.db            # SQLite chính: users, roles, apps, logs, app_storage
│   └── sessions.db          # Session của user
│
├── logs/                    # Log file của server (rotation)
├── backup/                  # Sao lưu định kỳ
├── install.bat              # Cài đặt lần đầu trên Windows
├── start.bat                # Khởi động Portal thủ công
└── install-as-service.bat   # Cài làm Windows Service
```

**Thay đổi so với rev 1:** dữ liệu mini-app lưu trong SQLite (bảng `app_storage`) thay vì file JSON riêng. Lý do xem mục 11.5.

## 4. Mô hình dữ liệu

### 4.1. Database `portal.db`

**Bảng `users`** — Tài khoản người dùng
- `id` — khóa chính
- `username` — duy nhất
- `password_hash` — hash bằng bcryptjs (cost 12)
- `full_name`
- `barcode` — duy nhất, dùng cho V2 (V1 để null)
- `role_id` — khóa ngoại tới `roles`
- `is_active` — boolean, có thể khóa user mà không xóa
- `must_change_password` — boolean, bắt buộc đổi password khi login lần đầu
- `failed_login_count` — đếm lần đăng nhập sai liên tiếp
- `locked_until` — timestamp, null nếu không bị khóa
- `created_at`

**Bảng `roles`** — Vai trò người dùng
- `id` — khóa chính
- `name` — mã kỹ thuật, vd `admin`, `qc`
- `display_name` — tên hiển thị
- `description`
- `is_admin` — cờ cho phép vào trang quản trị

**Bảng `apps`** — Đăng ký mini-app (V1.5+)
- `id` — khóa chính
- `slug` — duy nhất, dùng cho URL, regex `^[a-z0-9-]+$`
- `name` — tên hiển thị
- `description`
- `icon` — tên icon Tabler
- `url` — đường dẫn tương đối (do Portal tính từ status + slug)
- `status` — `stable` / `beta` / `disabled`
- `version` — chuỗi tự do
- `sort_order` — số nhỏ hiển thị trước
- `schema_json` — schema khai báo của app (đọc từ `<script id="cc-schema">` khi đăng ký)
- `schema_version` — version của schema hiện tại
- `created_at`

**Bảng `app_permissions`** — Ma trận App × Role
- `role_id` — khóa ngoại
- `app_id` — khóa ngoại
- (khóa chính kép)

**Bảng `app_storage`** — Dữ liệu mini-app (V1.5+)
- `app_id` — khóa ngoại
- `key` — chuỗi key trong namespace của app
- `value_json` — giá trị (JSON serialize)
- `version` — số nguyên, tăng mỗi lần update (optimistic concurrency)
- `created_by`, `created_at`
- `updated_by`, `updated_at`
- (khóa chính: `app_id`, `key`)
- Index: `(app_id, key)` cho prefix lookup

**Bảng `activity_logs`** — Nhật ký
- `id` — khóa chính
- `user_id` — có thể null nếu sự kiện không có user
- `username` — lưu kèm để xem được sau khi user bị xóa
- `action` — loại sự kiện
- `app_slug` — app liên quan (nếu có)
- `ip_address`
- `details` — JSON tùy ý, tối đa 1KB
- `created_at`

**Bảng `active_sessions`** — Theo dõi user online (V1.5+)
- `user_id` — khóa chính
- `username`
- `current_app` — slug app đang dùng, null nếu đang ở Portal
- `last_activity` — thời gian heartbeat cuối
- `ip_address`

### 4.2. Storage dữ liệu mini-app (V1.5+)

Lưu trong bảng `app_storage` của SQLite. Mỗi row là một key trong namespace của 1 app.

Value lưu dạng JSON string. Khi mini-app đọc về, Portal parse và trả về object. Mini-app không thấy `version` trực tiếp — Portal tự gắn vào field `_v` của object trả về.

Cấu trúc value điển hình:
```json
{
  "_v": 1,
  "_created_by": "qc01",
  "_created_at": "2026-05-14T08:30:00Z",
  "_updated_by": "qc01",
  "_updated_at": "2026-05-14T08:30:00Z",
  "ma_lo": "TOM-20260514-001",
  "trong_luong_kg": 250,
  "loai_tom": "sú"
}
```

Portal **bắt buộc validate** value theo `schema_json` của app trước khi lưu (xem mục 5.3).

## 5. Luồng xử lý chính

### 5.1. Luồng đăng nhập

1. User mở `http://server/` trong trình duyệt
2. Chưa có session → Portal redirect tới `/login`
3. User nhập username/password
4. Portal kiểm tra:
   - User có tồn tại và `is_active`?
   - Tài khoản có đang bị khóa tạm thời (`locked_until` > now)?
   - Password đúng (bcryptjs compare)?
5. Sai password → tăng `failed_login_count`. Vượt ngưỡng (mặc định 5) → set `locked_until = now + 15 phút`
6. Đúng → reset `failed_login_count`, tạo session, lưu vào `sessions.db`, cookie gửi về trình duyệt
7. Cookie có flag `httpOnly`, `SameSite=Strict`, `Secure` (nếu có HTTPS)
8. Ghi log `login`
9. Nếu `must_change_password = true` → redirect `/change-password`
10. Ngược lại → redirect `/` → dashboard

### 5.2. Luồng mở mini-app (V1.5+)

1. Trên dashboard, user click app "Nhập liệu tôm"
2. Trình duyệt mở tab mới với URL `/apps/nhap-lieu-tom/` (hoặc `/apps-beta/...` nếu beta)
3. Portal nhận request, kiểm tra:
   - User đã đăng nhập? → không thì redirect login
   - Slug hợp lệ regex? → không thì 400
   - App có tồn tại và không bị disabled?
   - User có quyền dùng app này? → không thì trả 403 + ghi log `access_denied`
4. Có quyền → ghi log `open_app`, cập nhật `active_sessions`
5. Phục vụ file `apps/nhap-lieu-tom/index.html` **kèm CSP header nghiêm ngặt** (xem mục 7.3)
6. Trang HTML load `portal-client.js` từ Portal
7. `portal-client.js` gọi `/api/me` lấy thông tin user
8. Bắt đầu chu kỳ heartbeat 30 giây/lần

### 5.3. Luồng mini-app lưu dữ liệu — Storage API (V1.5+)

**Endpoint mới (rev 2):** `/api/apps/:slug/storage/:key` — slug trong URL, không tin Referer.

**CREATE / UPDATE (POST/PUT):**

1. Mini-app gọi `PUT /api/apps/nhap-lieu-tom/storage/lo-tom:001` với body JSON
2. Portal kiểm tra:
   - User có session hợp lệ? → không thì 401
   - Slug từ URL có app tương ứng và không bị disabled? → không thì 404
   - User có quyền dùng app `nhap-lieu-tom`? → không thì 403
   - CSRF token có khớp? → không thì 403
   - Key có khớp regex `^[a-z0-9][a-z0-9\-:.]{0,199}$` và không chứa `..`? → không thì 400
   - Payload < 1MB? → không thì 413
3. Validate body theo schema của app:
   - Lấy prefix key trước `:` đầu tiên → tìm schema con
   - Validate từng field theo type, required, min/max, enum...
   - Sai → trả 400 với chi tiết field nào sai
4. Optimistic concurrency check:
   - Nếu body có `_v` → kiểm tra `_v` khớp với `version` trong DB:
     - Khớp: UPDATE, tăng `version` lên 1, set `_v = new version` trong response
     - Không khớp: trả 409 (VERSION_CONFLICT) với `_v` hiện tại trong DB
   - Nếu body không có `_v` → coi như CREATE:
     - Key đã tồn tại: trả 409
     - Chưa tồn tại: INSERT, set `version = 1`, `_v = 1`
5. Ghi log `data_write` (chỉ log key, không log value)
6. Trả về object đã lưu (kèm `_v` mới)

**READ (GET):**

1. `GET /api/apps/:slug/storage/:key`
2. Kiểm tra session + quyền (giống trên)
3. Tìm key trong namespace của app
4. Không có → 404
5. Có → trả về object + `_v`
6. Ghi log `data_read` (sample rate, không log mọi lần đọc)

**LIST (GET /api/apps/:slug/storage):**

1. Query param `prefix` (tùy chọn) để filter
2. Trả về array các key (không trả value để tiết kiệm bandwidth)

**DELETE:**

1. `DELETE /api/apps/:slug/storage/:key`
2. Kiểm tra session + quyền + CSRF
3. Xóa row tương ứng
4. Ghi log `data_delete`

### 5.4. Luồng theo dõi user online (V1.5+)

1. Mini-app gửi heartbeat mỗi 30 giây tới `/api/heartbeat` với `current_app` (lấy từ URL hiện tại)
2. Portal cập nhật `active_sessions`: `last_activity = now()`
3. Trang admin gọi `/admin/api/online` mỗi 5 giây
4. Portal trả về danh sách user có `last_activity` trong 2 phút gần nhất
5. Admin thấy real-time ai đang ở đâu

## 6. Các API chính

### 6.1. API xác thực (V1)

- `POST /login` — đăng nhập (CSRF token bắt buộc)
- `POST /logout` — đăng xuất
- `POST /change-password` — đổi password

### 6.2. API cho mini-app (V1.5+, cần session)

- `GET /api/me` — thông tin user đang đăng nhập
- `POST /api/heartbeat` — gửi tín hiệu "đang online" + app đang dùng
- `GET /api/apps/:slug/storage` — liệt kê các key trong namespace (có thể filter bằng `?prefix=`)
- `GET /api/apps/:slug/storage/:key` — đọc giá trị
- `PUT /api/apps/:slug/storage/:key` — lưu giá trị (CREATE/UPDATE, có version check)
- `DELETE /api/apps/:slug/storage/:key` — xóa
- `POST /api/apps/:slug/log` — mini-app ghi log nghiệp vụ tùy ý

**Lưu ý quan trọng:** slug trong URL được dùng làm "ground truth" để xác định namespace. Portal **không** dùng Referer header để xác định mini-app gọi API — vì Referer có thể bị thiếu/sai khi nhiều tab mở cùng lúc, hoặc bị attacker giả mạo.

Mọi API state-changing (`PUT`, `POST`, `DELETE`) đều yêu cầu CSRF token trong header.

### 6.3. API quản trị (V1, cần quyền admin)

- `GET /admin/api/online` — danh sách user online (V1.5+)
- `POST /admin/users` — tạo user
- `PUT /admin/users/:id` — sửa user
- `POST /admin/users/:id/lock` — khóa user
- `POST /admin/users/:id/reset-password` — reset password
- `POST /admin/roles` — tạo role
- `POST /admin/apps` — đăng ký app (Portal đọc schema từ HTML và validate) (V1.5+)
- `PUT /admin/apps/:id` — sửa app
- `POST /admin/apps/:id/toggle-permission` — bật/tắt quyền

### 6.4. Phục vụ mini-app (V1.5+)

- `GET /apps/:slug/*` — phục vụ file tĩnh của app stable
- `GET /apps-beta/:slug/*` — phục vụ file tĩnh của app beta

Tất cả các URL `/apps/*` và `/apps-beta/*`:
- Bắt buộc qua kiểm tra session + phân quyền trước khi serve file
- Response kèm CSP header (xem mục 7.3)
- Slug được validate regex chặt

## 7. Bảo mật

### 7.1. Mô hình mối đe dọa

CC Portal chạy trong LAN nội bộ. Các mối đe dọa chủ yếu:
- Nhân viên cố ý truy cập app không có quyền
- Nhân viên cố ý xem dữ liệu của bộ phận khác
- Tài khoản bị chia sẻ password
- Mất laptop có session đang mở
- Mini-app độc hại (do admin sai sót hoặc bị compromise) cố lấy dữ liệu của app khác hoặc thao tác với danh nghĩa user
- Sniffing password trên LAN (nếu không có HTTPS)

Không xét đến: tấn công từ Internet (vì không public), tấn công mạng có chủ đích phức tạp cấp độ APT.

### 7.2. Biện pháp bảo mật

**Xác thực:**
- Password hash bằng bcryptjs cost 12
- Yêu cầu password tối thiểu 10 ký tự, có chữ + số (validate server-side)
- Session lưu server-side, cookie chỉ chứa session ID
- Cookie `httpOnly=true`, `SameSite=Strict`, `Secure=true` (khi có HTTPS)
- Idle timeout 1 giờ (không có HTTP request từ user-action), absolute timeout 8 giờ
- Khóa tạm tài khoản sau 5 lần đăng nhập sai trong 15 phút (mặc định bật)
- Buộc đổi password khi login lần đầu (admin tạo user → password tạm)

**CSRF:**
- Token CSRF cho mọi POST/PUT/DELETE
- Cookie `SameSite=Strict` làm hàng rào đầu tiên

**Phân quyền:**
- Mọi request tới `/apps/*` và `/api/apps/:slug/*` đều kiểm tra session + quyền
- Slug lấy từ URL, không tin Referer
- Mỗi mini-app chỉ truy cập được namespace storage của chính nó (enforce ở server)
- Trang admin yêu cầu cờ `is_admin` ở role

**Logging:**
- Mọi hành động nhạy cảm được ghi log
- Log không thể bị sửa từ user thường (chỉ admin xem)
- Log lưu cả username (snapshot) để xem được sau khi user bị xóa
- Field `details` của log tối đa 1KB, Portal scrub pattern nhạy cảm (chuỗi giống password, số tài khoản)

**Path traversal:**
- Key storage regex `^[a-z0-9][a-z0-9\-:.]{0,199}$` AND không chứa `..`
- Slug app regex `^[a-z0-9-]+$`
- Path tới file mini-app phải nằm trong folder của app (resolve + check prefix)

**Validate schema:**
- Mọi write qua Storage API phải khớp schema khai báo của app
- Schema lưu trong DB, được parse từ `<script id="cc-schema">` khi đăng ký
- Validate ở server — không tin client

### 7.3. Content Security Policy cho mini-app

Khi serve file mini-app, Portal thêm header:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  connect-src 'self';
  img-src 'self' data:;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
```

**Ý nghĩa:**
- `script-src 'unsafe-inline'`: cho phép `onclick="..."` và `<script>...</script>` — cần thiết cho Vibe Coding HTML thuần
- Nhưng **không cho `'unsafe-eval'`** → `eval`, `new Function`, `setTimeout('string',...)` bị block
- `connect-src 'self'`: mini-app chỉ gọi được API Portal, không phải domain ngoài
- `frame-src 'none'`: không nhúng iframe (giảm XSS surface)

Whitelist CDN có thể mở rộng dần (Chart.js, PapaParse...) qua config Portal.

### 7.4. HTTPS từ V1

Mặc dù trong LAN, password gửi plaintext qua HTTP có thể bị bắt bằng ARP spoofing. Bắt buộc HTTPS từ V1.

**Chiến lược cert:** dùng **self-signed cert tự ký bằng root CA của công ty** xuyên suốt V1, V2, V3. KHÔNG mua cert thương mại — vì CA công khai không cấp cert cho domain nội bộ `.local` hoặc IP private (cấm theo CA/Browser Forum).

**V1 (giai đoạn tester, 5-10 máy):**
- Sinh self-signed root CA + server cert (xem mục C.1 trong `05-user-guide.md`).
- Cài root CA **thủ công** trên từng máy tester.
- Force redirect HTTP → HTTPS ở Portal.
- Chấp nhận: máy chưa cài CA → browser hiện cảnh báo lần đầu, bấm "Proceed" qua được.

**V2 (toàn công ty 20-100 máy):**
- Vẫn dùng đúng root CA và server cert của V1 (không phải đổi).
- Deploy root CA qua **Active Directory Group Policy** → mọi máy join domain tự động trust.
- Nhân viên truy cập Portal: không thấy cảnh báo nào.
- Chi tiết quy trình GPO: xem mục 7.5 và `05-user-guide.md` mục C.8.

**Vì sao không mua cert thương mại:**
- CA công khai cấm cấp cert cho `.local` và IP private từ 2015 — về mặt kỹ thuật không thể mua.
- Giải pháp thay thế (mua domain public + Let's Encrypt qua split-DNS) tốn cấu hình DNS phức tạp, không cần thiết khi đã có AD.
- Self-signed + GPO: free, không phụ thuộc Internet, không có cert hết hạn bất ngờ, kiểm soát hoàn toàn.

### 7.5. Bổ sung ở V2

- **Deploy root CA qua Active Directory Group Policy** — toàn bộ máy nhân viên tự động trust cert nội bộ, không còn cảnh báo "kết nối không an toàn"
- Reverse proxy chặn truy cập trực tiếp file mini-app (chỉ qua Portal)
- Audit log không thể xóa (append-only)
- 2FA cho admin (TOTP)
- Mã hóa data nhạy cảm trong DB (lương, v.v.)

## 8. Hiệu năng và mở rộng

### 8.1. Ước lượng tải

Với 100 user:
- Mỗi user 1 heartbeat/30s → 200 request/phút
- Mỗi user đọc/ghi storage ~10 lần/ngày → ~1000 request/ngày
- Số lượng record dự kiến trong 1 năm: hàng triệu (log)
- Kích thước database sau 1 năm: ước tính <500MB

→ Node.js + SQLite xử lý dư sức.

### 8.2. Điểm nghẽn tiềm năng

**Khi nào cần lo:**
- Trên 500 user đồng thời → cân nhắc chuyển từ SQLite sang PostgreSQL
- Mini-app có nhiều dữ liệu (tổng > 100MB / app) → cân nhắc storage backend riêng
- Log quá lớn → archive log cũ ra file Excel rồi xóa khỏi DB
- Sao lưu chậm (database lớn) → dùng incremental backup

### 8.3. Mở rộng theo chiều ngang

Trong giai đoạn V1, không hỗ trợ chạy nhiều instance Portal (vì SQLite không phù hợp). Nếu cần mở rộng:
- V3 chuyển sang PostgreSQL + nhiều instance Portal sau load balancer

## 9. Triển khai

### 9.1. Yêu cầu hệ thống

- Windows Server 2016+ hoặc Windows 10/11
- Node.js 18 LTS hoặc mới hơn
- 2GB RAM, 20GB ổ đĩa (rất dư)
- Mạng LAN ổn định

### 9.2. Cài đặt

1. Cài Node.js từ trang chủ
2. Copy folder dự án lên server
3. Chạy `install.bat` (cài npm packages, khởi tạo DB, sinh self-signed cert)
4. Chạy `start.bat` hoặc `install-as-service.bat`
5. Mở port 443 (HTTPS) trên Windows Firewall (inbound)
6. Login bằng admin mặc định và **đổi password ngay** (Portal sẽ force change-on-first-login)

### 9.3. Sao lưu

**Cách đúng cho SQLite (atomic, không corrupt khi DB đang chạy):**
- Tạo task Windows Scheduler chạy mỗi ngày 0:00
- Task chạy `sqlite3 data/portal.db ".backup backup/portal-YYYYMMDD.db"`
- Hoặc dùng `VACUUM INTO` từ Node.js process Portal
- Giữ 30 ngày backup gần nhất
- Copy backup ra NAS hoặc máy khác trong LAN định kỳ

**Cách KHÔNG nên dùng:**
- `xcopy` hoặc `copy` file `.db` khi Portal đang chạy → backup có thể corrupt

### 9.4. Cập nhật code Portal

1. Dừng Portal
2. Backup folder `data/` bằng SQLite backup API
3. Cập nhật code (git pull hoặc thay file)
4. `npm install` nếu có dependency mới
5. Chạy migration nếu có thay đổi schema
6. Khởi động lại Portal
7. Kiểm tra hoạt động

## 10. Ràng buộc và giả định

**Giả định:**
- User dùng trình duyệt hiện đại (Chrome, Edge, Firefox bản trong 2 năm gần đây) — hỗ trợ CSP đầy đủ
- Mạng LAN ổn định (không bị mất kết nối thường xuyên)
- Server Windows được bảo trì hệ điều hành định kỳ
- Có ít nhất 1 người trong công ty hiểu cơ bản về vận hành Windows Service

**Ràng buộc:**
- Mọi mini-app phải là HTML/JS thuần — không hỗ trợ app cần backend riêng
- Mini-app phải tuân thủ CSP (no eval, no external CDN ngoài whitelist)
- Không hỗ trợ mobile-first trong V1/V1.5
- Không hỗ trợ làm việc offline
- Không thể chia sẻ session giữa nhiều thiết bị của cùng 1 user (V2 sẽ xem xét)

## 11. Quyết định thiết kế quan trọng

### 11.1. Tại sao SQLite mà không phải MySQL/PostgreSQL?

SQLite phù hợp với quy mô 20-100 user. Ưu điểm:
- Không cần cài DB server riêng
- Backup chỉ là 1 lệnh SQLite backup API
- Hiệu năng tốt với workload đọc nhiều, ghi vừa phải
- AI viết SQL cho SQLite tốt hơn

Khi nào cần đổi: khi vượt 500 user đồng thời hoặc cần nhiều instance Portal.

### 11.2. Tại sao slug nằm trong URL Storage API, không qua Referer?

Rev 1 đề xuất xác định mini-app gọi API qua header Referer. Rev 2 bỏ cách này:
- Referer có thể bị trình duyệt strip (Referrer-Policy)
- Khi user mở 2 tab cùng lúc, Referer của một fetch có thể không khớp với app đang chạy
- Attacker có thể giả mạo Referer (qua extension hoặc proxy)
- Slug trong URL là "ground truth" rõ ràng — Portal verify quyền theo slug, không cần đoán

Trade-off: URL dài hơn một chút (`/api/apps/<slug>/storage/<key>` thay vì `/api/storage/<key>`). Đáng giá vì bảo mật rõ ràng hơn nhiều.

### 11.3. Tại sao bắt buộc khai báo schema?

Rev 1 coi schema là khuyến nghị. Rev 2 bắt buộc, vì:
- **Bảo vệ data ngay từ V1.5** — tránh app cẩu thả ghi data sai cấu trúc
- **Chuẩn bị migration V3** — khi chuyển sang DB chung, schema đã có sẵn
- **Validation tập trung** — không phải tin client validate (vì client có thể bị bypass)
- **Tự document app** — admin biết app này lưu loại record gì mà không cần đọc code

Chi phí cho mỗi mini-app: thêm 1 block JSON trong HTML. Nhỏ so với lợi ích.

### 11.4. Tại sao mini-app dùng Storage API thay vì truy cập DB chung?

Đã thảo luận kỹ trong `01-functional-spec.md` mục 5.7 và `04-roadmap-future.md`.

Tóm tắt: V1.5 giữ mini-app độc lập tuyệt đối để dễ thử nghiệm, V3 sẽ chuyển sang DB chung khi đã chứng minh giá trị.

### 11.5. Tại sao chuyển mini-app data từ file JSON sang SQLite?

Rev 1 đề xuất mỗi app 1 file JSON trong folder. Rev 2 chuyển vào bảng `app_storage` của SQLite:
- **Concurrency:** Portal không phải tự xử lý lock khi nhiều user ghi cùng app — SQLite lo
- **Atomicity backup:** chỉ cần backup 1 file `portal.db` thay vì cả folder JSON + DB
- **Hiệu năng:** lookup theo key trong bảng index nhanh hơn parse cả file JSON
- **Optimistic concurrency:** dễ implement với cột `version` trong DB
- **Prefix filter:** SQL `WHERE key LIKE 'lo-tom:%'` hiệu quả hơn JS filter

Trade-off: không thấy data trong file riêng nữa, phải dùng SQLite CLI hoặc admin UI để inspect. Đáng giá.

### 11.6. Tại sao không dùng framework hiện đại (React, Vue) cho Portal UI?

Portal cần đơn giản, dễ bảo trì lâu dài, không có build step. HTML + EJS + CSS thuần đáp ứng đủ. Cách này cũng phù hợp khi muốn AI sửa giao diện sau này.

### 11.7. Tại sao mini-app không có backend riêng?

Quyết định cốt lõi để giữ Vibe Coding đơn giản. Nếu mỗi mini-app có backend riêng:
- Phải chọn ngôn ngữ, cài thư viện, quản lý process
- Mỗi app trở thành "hệ thống nhỏ" thay vì "file HTML"
- Vượt khả năng của Vibe Coding với AI hiện tại
- Bảo trì 10 backend phức tạp hơn nhiều so với 1 Portal + 10 file HTML
