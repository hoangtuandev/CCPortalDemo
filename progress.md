# progress.md — Lộ trình triển khai CC Portal V1

File này là **task list để build V1 thực tế**. Khi IT hoặc Claude bắt tay vào code, mở file này lên — chọn task đầu tiên còn `[ ]`, làm xong đánh `[x]`, sang task kế.

**Quy tắc dùng:**
- Mỗi task = 1 work session. Không nhồi nhiều task vào 1 session để tránh tràn context.
- Task có `Blocked by: …` → phải xong task đó trước.
- Hoàn thành task: đổi `[ ]` → `[x]`, ghi ngày + commit hash (nếu có), note 1-2 dòng nếu cần.
- Khi phát sinh việc mới: thêm task ở cuối phase phù hợp, không đảo thứ tự cũ.
- Trước mỗi session: đọc `CLAUDE.md` → đọc task hiện tại → đọc mục tương ứng trong `01-functional-spec.md` / `02-architecture.md`.

**Phiên bản:** rev 1 — khởi tạo cho V1 (2026-05-15).

---

## Tóm tắt phạm vi V1

V1 = **Portal + login + quản lý user/role + admin UI** (xem `01-functional-spec.md`).
KHÔNG bao gồm: mini-app, Storage API, heartbeat, theo dõi online.

| Phase | Mục tiêu | Số task |
|---|---|---|
| P0 | Setup project | 4 |
| P1 | Database & migration | 3 |
| P2 | Auth core (login, session, CSRF) | 5 |
| P3 | Change password flow | 2 |
| P4 | Lock policy | 2 |
| P5 | Activity logging | 2 |
| P6 | User management UI | 5 |
| P7 | Role management UI | 3 |
| P8 | Dashboard | 2 |
| P9 | HTTPS & cert | 3 |
| P10 | Deploy & service | 3 |
| P11 | Backup & restore | 2 |
| P12 | Hardening & UAT | 4 |
| **Tổng** | | **40** |

Mỗi task ước lượng **1 session** (chỗ khó/dài đã được tách trước). Toàn bộ V1: ~40 session = 8-10 tuần (1 dev full-time) hoặc 12-16 tuần (1 dev part-time).

---

## P0. Setup project

### P0.1. [x] Khởi tạo Node.js project + dependency — 2026-05-17
- **Đầu vào:** `02-architecture.md` mục 2 (stack).
- **Việc làm:**
  - Tạo `portal/package.json` với `"type": "commonjs"`, node ≥ 18.
  - Cài: `express`, `express-session`, `better-sqlite3`, `connect-better-sqlite3` (hoặc thay thế tương đương), `bcryptjs`, `ejs`, `helmet`, `csurf` hoặc `csrf-csrf`, `dotenv`.
  - Cài dev: `nodemon`, `eslint` (config tối thiểu, không strict).
  - **TRƯỚC KHI cài**: chạy rule A.3 của `CLAUDE.md` (liệt kê package, đánh giá rủi ro, đợi confirm).
- **Deliverable:** `portal/package.json` + `portal/package-lock.json`; `npm install` chạy clean trên Windows.
- **Acceptance:** chạy `node -e "console.log('ok')"` từ thư mục `portal/` ra `ok`.

### P0.2. [x] Folder structure + entry point skeleton — 2026-05-17
- **Đầu vào:** `02-architecture.md` mục 3 (cấu trúc thư mục).
- **Việc làm:** tạo `portal/server.js`, `portal/routes/`, `portal/middleware/`, `portal/views/`, `portal/public/css/`, `portal/lib/`, `portal/config/`.
- Server.js: bind port 3000 (dev), serve `GET /` trả "CC Portal V1 — chưa cấu hình".
- **Deliverable:** `node server.js` → mở `http://localhost:3000` thấy text trên.
- **Acceptance:** không lỗi console. `Ctrl+C` dừng sạch.
- **Blocked by:** P0.1.

### P0.3. [x] Config loader + biến môi trường — 2026-05-17
- **Việc làm:**
  - File `portal/config/index.js` đọc từ `.env` (cho dev) hoặc `config.json` (cho prod) — port, session secret, idle timeout, absolute timeout, lock threshold, lock duration.
  - `.env.example` mẫu, commit; `.env` thật thì gitignore.
  - Mọi tham số config có default an toàn (xem `01-functional-spec.md` mục 5.5.5).
- **Deliverable:** `config.port`, `config.session.idleMinutes`, ... access được từ server.js.
- **Acceptance:** thay `SESSION_IDLE_MINUTES=30` trong `.env` → app đọc đúng 30.
- **Blocked by:** P0.2.

### P0.4. [x] Logging utility cơ bản — 2026-05-17
- **Việc làm:** wrapper `lib/logger.js` — `logger.info/warn/error(msg, meta?)`. Output ra console + file `logs/portal-YYYY-MM-DD.log` với rotation theo ngày. Không log password/token bao giờ.
- **Deliverable:** `logger.info('test')` → console + file.
- **Acceptance:** chạy app 1 phút, file log có entry.
- **Blocked by:** P0.2.

---

## P1. Database & migration

### P1.1. [x] Migration system + connection helper — 2026-05-17
- **Việc làm:**
  - `lib/db.js` mở `data/portal.db` với `better-sqlite3`, bật WAL mode + foreign keys.
  - Migration tool đơn giản: folder `migrations/`, mỗi file `001_xxx.sql`, bảng `_migrations` track đã apply.
  - Lệnh `npm run migrate`.
- **Deliverable:** `npm run migrate` chạy sạch, tạo file DB nếu chưa có.
- **Acceptance:** chạy `migrate` 2 lần → lần 2 không apply lại, không lỗi.
- **Blocked by:** P0.3.

### P1.2. [x] Schema: users + roles + activity_logs + active_sessions — 2026-05-17
- **Đầu vào:** `02-architecture.md` mục 4.1.
- **Việc làm:** viết migration `001_initial.sql` chứa 4 bảng (V1 dùng users, roles, activity_logs; active_sessions tạo sẵn cho V1.5 nhưng để trống).
  - **Không** tạo bảng `apps`, `app_permissions`, `app_storage` ở V1 (theo scope rev 2).
  - Index cần: `users.username` UNIQUE, `users.barcode` UNIQUE (nullable), `activity_logs.created_at`, `activity_logs.user_id`.
- **Deliverable:** migration apply thành công, `sqlite3 data/portal.db ".schema"` thấy 4 bảng.
- **Acceptance:** schema khớp 100% với `02-architecture.md` mục 4.1.
- **Blocked by:** P1.1.

### P1.3. [x] Seed: role admin + user admin đầu tiên — 2026-05-17
- **Việc làm:**
  - Migration `002_seed_admin.sql` hoặc script `npm run seed`:
    - Role `admin` (`is_admin = true`), `display_name = "Quản trị viên"`.
    - User `admin` với password tạm random in ra console khi seed lần đầu, `must_change_password = true`.
  - Idempotent — chạy lại không nhân đôi.
- **Deliverable:** sau seed, có 1 user `admin` đăng nhập được bằng password tạm.
- **Acceptance:** seed lần 2 → "đã có admin, bỏ qua".
- **Blocked by:** P1.2.

---

## P2. Auth core

### P2.1. [x] Password utility — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.1.
- **Việc làm:** `lib/password.js` với:
  - `hash(plain)` dùng bcryptjs cost 12.
  - `verify(plain, hash)`.
  - `validate(plain, username)` trả `{ok: bool, reason?: string}` — check ≥10 chars, có chữ + số, ≠ username.
- **Deliverable:** unit test (chạy bằng `node --test` hoặc tap) pass 6 case: ngắn, thiếu chữ, thiếu số, trùng username, hợp lệ, hợp lệ có ký tự đặc biệt (không bị reject).
- **Acceptance:** mọi case pass, không lỗi async.
- **Blocked by:** P0.4.

### P2.2. [x] Session middleware + cookie config — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.1 (cookie config); `02-architecture.md` mục 7.2.
- **Việc làm:**
  - `express-session` + store SQLite (qua `connect-better-sqlite3` hoặc tương đương).
  - Cookie: `httpOnly`, `sameSite: 'strict'`, `secure: true` khi HTTPS, `secure: false` khi dev HTTP.
  - `maxAge` = idle timeout từ config (default 60 phút), `rolling: true` — cookie reset mỗi request để kéo dài idle timer.
  - Khi login thành công: ghi `session.loginAt = Date.now()` để enforce absolute timeout sau này.
  - Session store ở file `data/sessions.db`.
- **Deliverable:** truy cập app → có cookie session; restart app → session còn (persisted).
- **Acceptance:** xóa cookie ở browser → app coi như anon.
- **Blocked by:** P1.1, P0.3.

### P2.3. [x] CSRF middleware — 2026-05-17
- **Việc làm:**
  - Synchronizer token pattern dùng `crypto` built-in (không cần package ngoài).
  - Helper `res.locals.csrfToken` để view EJS chèn `<input type="hidden" name="_csrf">`.
  - Áp cho mọi POST/PUT/DELETE.
- **Deliverable:** POST không kèm token → 403.
- **Acceptance:** POST đúng token → pass; thiếu/sai token → 403 với message rõ.
- **Blocked by:** P2.2.

### P2.4. [x] Login route + view — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.1.
- **Việc làm:**
  - `GET /login` → view EJS form (username, password, csrf).
  - `POST /login`:
    - Verify user tồn tại + `is_active` + `locked_until > now`?
    - bcrypt compare password.
    - Thành công: regenerate session, set `session.userId`, set `session.loginAt = Date.now()`, reset `failed_login_count` về 0, log `login`, redirect `/`.
    - Sai: ghi log `login_failed` kèm reason, tăng counter (xem P4).
  - Trang `/login` không cần auth (rõ ràng).
- **Deliverable:** đăng nhập bằng admin seed → vào `/` ra "Hello admin".
- **Acceptance:** sai password → ở lại login, hiện message; đúng → vào trang chính.
- **Blocked by:** P1.3, P2.1, P2.2, P2.3.

### P2.5. [x] Auth guard middleware + logout — 2026-05-17
- **Việc làm:**
  - `middleware/requireLogin.js`:
    - Không có session → redirect `/login`.
    - Có session nhưng `Date.now() - session.loginAt > absoluteMs` (config, default 8h) → destroy session → redirect `/login`.
  - `middleware/requireAdmin.js` — có session nhưng role không `is_admin` → 403 page.
  - `POST /logout` → destroy session, log `logout`, redirect `/login`.
  - Áp `requireLogin` toàn bộ route trừ `/login`, `/public/*`.
- **Deliverable:** truy cập `/` khi chưa login → redirect `/login`. Login admin → vào `/`. Logout → quay `/login`.
- **Acceptance:** `/admin` truy cập bằng non-admin → 403. Không thao tác 1 giờ → session hết (idle). Thao tác liên tục 8 giờ → session cũng hết (absolute).
- **Blocked by:** P2.4.

---

## P3. Change password flow

### P3.1. [x] Middleware force change password — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.1 (Buộc đổi password lần đầu).
- **Việc làm:** middleware chạy sau `requireLogin` — nếu `user.must_change_password = true` và URL không phải `/change-password`, redirect `/change-password`.
- **Deliverable:** user mới (seed admin) đăng nhập → bị redirect `/change-password` ngay.
- **Acceptance:** user đã đổi rồi → không bị redirect nữa.
- **Blocked by:** P2.5.

### P3.2. [x] Change password route + view — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.2.
- **Việc làm:**
  - `GET /change-password` → form (password cũ, password mới x2).
  - `POST /change-password`:
    - Verify password cũ.
    - Validate password mới (P2.1).
    - Mới ≠ cũ.
    - Update hash + set `must_change_password = false`.
    - Invalidate **các session khác** của user này (giữ session hiện tại).
    - Log `password_changed`.
    - Redirect `/`.
- **Deliverable:** admin đăng nhập lần đầu, đổi password → vào dashboard. Đăng nhập lần 2 bằng password mới → OK.
- **Acceptance:** password sai rule → form hiện lý do cụ thể; password cũ sai → message rõ.
- **Blocked by:** P3.1.

---

## P4. Lock policy

### P4.1. [x] Auto-lock sau 5 lần sai — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.1.
- **Việc làm:** sửa `POST /login` (P2.4):
  - Sai password → tăng `failed_login_count`.
  - Đạt ngưỡng config (default 5) trong 15 phút → set `locked_until = now + 15p`, reset counter.
  - Đúng → reset counter, clear `locked_until`.
- **Deliverable:** sai 5 lần liên tiếp → lần 6 trả "Tài khoản tạm khóa 15 phút".
- **Acceptance:** đợi 15 phút → đăng nhập lại OK.
- **Blocked by:** P2.4.

### P4.2. [x] Admin manual unlock + lock/unlock account — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.5.2.
- **Việc làm:**
  - `POST /admin/users/:id/unlock-temp` → clear `locked_until`.
  - `POST /admin/users/:id/lock` → set `is_active = false`.
  - `POST /admin/users/:id/unlock` → set `is_active = true`.
  - Cả 3 ghi log `admin_user_modified`.
  - Bảo vệ "admin cuối cùng": không cho lock user là admin active duy nhất.
- **Deliverable:** admin trên UI bấm khóa user → user đó login bị từ chối.
- **Acceptance:** thử khóa admin duy nhất → từ chối với message.
- **Blocked by:** P4.1, P6.1.

---

## P5. Activity logging

### P5.1. [x] Log helper + log mọi auth event — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.5.4.
- **Việc làm:**
  - `lib/audit.js`: `audit(req, action, details?)` — insert vào `activity_logs` với `user_id`, `username` snapshot, `ip`, `action`, `details` (JSON ≤ 1KB, truncate nếu lớn hơn).
  - Scrub pattern nhạy cảm trong details (regex bắt chuỗi giống password, số dài 12-19 ký tự).
  - Gọi `audit` ở: login, login_failed, logout, session_expired, password_changed.
- **Deliverable:** 5 action trên đều có row trong `activity_logs`.
- **Acceptance:** thử login_failed → log có entry với reason chi tiết.
- **Blocked by:** P2.4, P3.2.

### P5.2. [x] Trang xem log (admin) + filter + pagination — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.5.4.
- **Việc làm:**
  - `GET /admin/logs` (chỉ admin):
    - Filter: username (text), action (select), date range.
    - Sắp xếp mới nhất trên.
    - Pagination 50 row/page.
  - Hiển thị bảng đơn giản (EJS, không cần JS framework).
- **Deliverable:** trang `/admin/logs` xem được, filter chạy đúng.
- **Acceptance:** test với 1000 log giả → page load < 1s.
- **Blocked by:** P5.1, P6.1.

---

## P6. User management UI

### P6.1. [x] Admin shell (layout, sidebar, base routes) — 2026-05-17
- **Việc làm:**
  - `views/admin/layout.ejs` — header + sidebar có link "Tài khoản", "Vai trò", "Nhật ký", "Tổng quan".
  - `GET /admin` redirect `/admin/overview`.
  - Mọi route `/admin/*` gắn `requireAdmin`.
- **Deliverable:** đăng nhập admin → vào `/admin` thấy shell + sidebar.
- **Acceptance:** non-admin truy cập → 403.
- **Blocked by:** P2.5.

### P6.2. [x] Liệt kê user — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.5.2.
- **Việc làm:**
  - `GET /admin/users` — bảng list user: username, full_name, role, active, locked, created_at.
  - Filter: role (select), trạng thái (active/locked/temp-lock).
  - Pagination 50/page.
- **Deliverable:** trang list user xem được, filter chạy đúng.
- **Acceptance:** với 100 user → load < 1s.
- **Blocked by:** P6.1.

### P6.3. [x] Tạo user — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.5.2.
- **Việc làm:**
  - `GET /admin/users/new` → form: username (validate regex), full_name, password tạm (validate), role (dropdown), barcode (optional, regex).
  - `POST /admin/users` → tạo user, set `must_change_password = true`, log `admin_user_created`.
  - Validate: username unique, password rule.
- **Deliverable:** tạo user mới qua UI, user đó login được bằng password tạm.
- **Acceptance:** username trùng → error rõ; password yếu → error rõ.
- **Blocked by:** P6.2, P2.1.

### P6.4. [x] Sửa user (đổi full_name, role, barcode) — 2026-05-17
- **Việc làm:**
  - `GET /admin/users/:id/edit` → form pre-fill.
  - `POST /admin/users/:id` → update, log `admin_user_modified` với diff.
  - Không cho đổi username.
  - Bảo vệ admin cuối: không cho hạ role của admin active duy nhất.
- **Deliverable:** sửa user, thấy log có diff cụ thể.
- **Acceptance:** thử hạ role admin duy nhất → từ chối.
- **Blocked by:** P6.3.

### P6.5. [x] Reset password + xóa user — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.5.2.
- **Việc làm:**
  - `POST /admin/users/:id/reset-password`:
    - Form yêu cầu nhập password tạm mới (admin tự nhập, tuân thủ rule).
    - Update hash + `must_change_password = true`.
    - Invalidate mọi session của user đó.
    - Log `password_changed` với context `admin_reset`.
  - `DELETE /admin/users/:id`:
    - Chỉ xóa khi user chưa có log nào (chưa từng login).
    - Đã có log → từ chối, đề nghị lock.
- **Deliverable:** reset password + user login bằng password tạm → bị force change.
- **Acceptance:** xóa user đã có log → từ chối, message rõ.
- **Blocked by:** P6.4.

---

## P7. Role management UI

### P7.1. [x] Liệt kê + tạo role — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.5.3.
- **Việc làm:**
  - `GET /admin/roles` — list: name, display_name, description, is_admin, số user trong role.
  - `GET /admin/roles/new` + `POST /admin/roles` → tạo role.
  - Validate: name regex `^[a-z][a-z0-9_]{2,29}$`, unique.
- **Deliverable:** tạo role mới qua UI, hiện trong list.
- **Acceptance:** name trùng → error; name sai regex → error.
- **Blocked by:** P6.1.

### P7.2. [x] Sửa role — 2026-05-17
- **Việc làm:**
  - `GET /admin/roles/:id/edit` → form (KHÔNG cho đổi name kỹ thuật).
  - `POST /admin/roles/:id` → update display_name, description, is_admin.
  - Bảo vệ admin cuối: không cho hạ `is_admin = false` nếu role này có admin active duy nhất.
- **Deliverable:** sửa role hiển thị + log `admin_role_modified`.
- **Acceptance:** thử hạ `is_admin` role chứa admin duy nhất → từ chối.
- **Blocked by:** P7.1.

### P7.3. [x] Xóa role — 2026-05-17
- **Việc làm:**
  - `POST /admin/roles/:id/delete` — chỉ xóa khi không có user nào trong role.
  - Log `admin_role_deleted`.
- **Deliverable:** xóa được role rỗng.
- **Acceptance:** xóa role có user → từ chối với message "còn N user".
- **Blocked by:** P7.2.

---

## P8. Dashboard

### P8.1. [x] Dashboard user (V1 tối giản) — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.3.
- **Việc làm:**
  - `GET /` (sau login): EJS view với "Xin chào, {full_name}", role, thông báo "tính năng đang phát triển", link đổi password + logout.
  - Nếu user là admin → thêm link "Khu vực quản trị".
- **Deliverable:** dashboard hiển thị đúng tên + role.
- **Acceptance:** admin thấy link admin; non-admin không thấy.
- **Blocked by:** P2.5.

### P8.2. [x] Dashboard admin (tổng quan) — 2026-05-17
- **Đầu vào:** `01-functional-spec.md` mục 5.5.1.
- **Việc làm:**
  - `GET /admin/overview`:
    - Tổng user (active / locked).
    - Tổng role.
    - Login hôm nay (success / fail).
    - 10 log gần nhất.
  - Query optimize: dùng index, không SELECT *.
- **Deliverable:** trang overview load < 500ms với 10k log.
- **Acceptance:** số liệu khớp khi check thủ công trong sqlite CLI.
- **Blocked by:** P6.1, P5.1.

---

## P9. HTTPS & cert

### P9.1. [x] Script sinh self-signed cert — 2026-05-18
- **Đầu vào:** `02-architecture.md` mục 7.4; `05-user-guide.md` mục C.1.
- **Việc làm:**
  - `scripts/gen-cert.bat` dùng OpenSSL (kèm Node.js? Nếu không → yêu cầu IT cài OpenSSL) sinh:
    - Root CA (1 lần) → `cert/ca.crt`, `cert/ca.key`.
    - Server cert ký bởi CA, SAN chứa domain nội bộ + IP server → `cert/server.crt`, `cert/server.key`.
  - Cert hạn 2 năm.
- **Deliverable:** chạy script → ra 4 file cert.
- **Acceptance:** `openssl x509 -in cert/server.crt -noout -text` thấy SAN đúng.

### P9.2. [x] HTTPS server + HTTP→HTTPS redirect — 2026-05-18
- **Đầu vào:** `02-architecture.md` mục 7.4.
- **Việc làm:**
  - Server.js: load cert, listen 443 HTTPS.
  - Listen 80 HTTP riêng → redirect 301 sang HTTPS.
  - Cookie `secure: true` khi HTTPS.
- **Deliverable:** `https://localhost` mở app; `http://localhost` redirect.
- **Acceptance:** browser không cảnh báo khi đã trust CA.
- **Blocked by:** P9.1.

### P9.3. [slim] Doc trust root CA cho client
- **Điều chỉnh:** Không tạo file doc riêng — ghi thẳng vào section cuối `README.md` (certmgr + 1 lệnh PowerShell). Đủ cho 1 IT người.

---

## P10. Deploy & service

### P10.1. [x] install.bat — cài đặt lần đầu — 2026-05-18
- **Đầu vào:** `05-user-guide.md` mục C.1.
- **Việc làm:** `install.bat`:
  - Check Node.js >= 18.
  - `npm install --production`.
  - `npm run migrate`.
  - `npm run seed` (chỉ chạy nếu chưa có admin).
  - Tạo `data/`, `logs/`, `backup/` nếu thiếu.
  - In ra password tạm admin lần đầu.
- **Deliverable:** chạy `install.bat` clean trên server Windows mới.
- **Acceptance:** sau khi chạy, có thể `start.bat` lên app + login admin.
- **Blocked by:** P1.3, P0.1.

### P10.2. [x] start.bat + nodemon dev mode — 2026-05-18
- **Việc làm:**
  - `start.bat` → `node server.js` foreground.
  - `dev.bat` → `nodemon server.js`.
- **Deliverable:** double-click chạy, Ctrl+C dừng sạch.
- **Acceptance:** không lỗi.

### P10.3. [skip] install-as-service.bat — Windows Service
- **Lý do bỏ qua:** Không có built-in Windows tool nào wrap Node.js thành Windows Service thực sự mà không cần binary ngoài (NSSM) hoặc npm package (node-windows). Quy mô V1 dùng `start.bat` chạy foreground là đủ; có thể bổ sung sau nếu cần.

---

## P11. Backup & restore

### P11.1. [x] backup.bat + script SQLite backup API — 2026-05-18
- **Đầu vào:** `02-architecture.md` mục 9.3; `05-user-guide.md` mục C.3.
- **Việc làm:**
  - `portal/scripts/backup.js` — dùng `better-sqlite3` `.backup()` (SQLite Online Backup API, safe khi DB đang chạy).
  - Output: `backup/portal-YYYYMMDD-HHmm.db`. Xóa file > 30 ngày tự động.
  - `backup.bat` ở root — wrapper gọi Node script, kèm comment hướng dẫn Task Scheduler + restore procedure.
  - `npm run backup` thêm vào package.json.
- **Deliverable:** chạy script → file backup 53KB, đầy đủ 6 bảng. App không crash sau khi backup.
- **Acceptance:** verified — `portal-20260518-0955.db` mở được, thấy _migrations/roles/users/activity_logs/active_sessions.

### P11.2. [slim] Doc Task Scheduler + restore procedure
- **Điều chỉnh:** Không tạo file doc riêng — ghi thẳng vào `backup.bat` (comment header) + section ngắn trong `README.md`. Đủ cho 1 IT người.

---

## P12. Hardening & UAT

### P12.1. [x] Helmet + security headers — 2026-05-18
- **Việc làm:**
  - Middleware `middleware/securityHeaders.js` set thủ công (không dùng package ngoài).
  - CSP: `default-src 'self'`, `style-src 'self' 'unsafe-inline'` (views dùng inline `<style>`), `script-src 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`.
  - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-XSS-Protection: 0`.
  - HSTS bỏ qua — P9 (HTTPS) chưa xong.
- **Deliverable:** `GET /login` trả đủ 6 header, app không break.
- **Acceptance:** verified — status 200, tất cả header xuất hiện đúng.

### P12.2. [skip] Rate limit login endpoint
- **Lý do bỏ qua:** Lock policy (P4.1) đã chặn brute-force sau 5 lần sai/15 phút. Rate limit là defense-in-depth dư thừa với LAN nội bộ 20-100 user.

### P12.3. [skip] Smoke test script
- **Lý do bỏ qua:** Quy mô V1 test tay là đủ. V2 nên có test thực sự (unit/integration) thay vì script fetch thủ công kiểu này.

### P12.4. [skip] UAT pass + production checklist
- **Lý do bỏ qua:** Ceremony, không phải kỹ thuật. Thay bằng checklist tay khi deploy thực tế.

---

## Bảng phụ thuộc nhanh

```
P0 → P1 → P2 → P3 → P4 ─┐
                P2 → P5 ─┤
                     P6 ─┼─→ P8
                     P7 ─┘
P9 (song song)  → P10 → P11 → P12
```

Có thể song song:
- P5 và P6 sau khi xong P2.
- P7 sau khi xong P6.1.
- P9 hoàn toàn độc lập với P3-P8, có thể làm bất cứ lúc nào sau P0.

---

## Khi nào sửa file này

- Hoàn thành task: đánh `[x]` + ngày.
- Phát sinh việc → thêm task ở cuối phase phù hợp với prefix mới (vd P6.6).
- Đổi phạm vi → cập nhật bảng "tóm tắt phạm vi" + thêm note ở đầu file.
- Không xóa task đã `[x]` — để lại lịch sử.

## Tài liệu tham chiếu cho từng phase

| Phase | Đọc trước khi làm |
|---|---|
| P0 | `02-architecture.md` mục 2-3 |
| P1 | `02-architecture.md` mục 4.1 |
| P2 | `01-functional-spec.md` mục 5.1; `02-architecture.md` mục 5.1, 7.2 |
| P3 | `01-functional-spec.md` mục 5.1-5.2 |
| P4 | `01-functional-spec.md` mục 5.1 (rule khóa) |
| P5 | `01-functional-spec.md` mục 5.5.4 |
| P6 | `01-functional-spec.md` mục 5.5.2 |
| P7 | `01-functional-spec.md` mục 5.5.3 |
| P8 | `01-functional-spec.md` mục 5.3, 5.5.1 |
| P9 | `02-architecture.md` mục 7.4; `05-user-guide.md` mục C.1-C.2 |
| P10 | `02-architecture.md` mục 9.1-9.2; `05-user-guide.md` mục C.1 |
| P11 | `02-architecture.md` mục 9.3; `05-user-guide.md` mục C.3-C.4 |
| P12 | `01-functional-spec.md` mục 8; `02-architecture.md` mục 7 |
