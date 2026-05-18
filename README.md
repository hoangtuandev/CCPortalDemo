# CC Portal

Cổng nội bộ dành cho công ty vừa và nhỏ — quản lý tài khoản nhân viên, phân quyền, theo dõi hoạt động đăng nhập.

Chạy trên Windows Server nội bộ (LAN), không cần Internet.

## Tính năng V1

- Đăng nhập / đăng xuất — session server-side, CSRF protection, idle + absolute timeout
- Buộc đổi password khi đăng nhập lần đầu
- Khóa tài khoản tự động sau 5 lần sai liên tiếp
- Quản lý tài khoản: tạo, sửa, reset password, khóa/mở khóa
- Quản lý vai trò: tạo, sửa, xóa role; flag `is_admin`
- Nhật ký hoạt động: lọc theo user, action, ngày; pagination 50 dòng/trang
- Dashboard admin: tổng quan user, role, login hôm nay, 10 log gần nhất
- Backup database — script Node.js dùng SQLite Online Backup API (safe khi app đang chạy)
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy

## Stack

| Thành phần | Công nghệ |
|---|---|
| Runtime | Node.js ≥ 18 |
| Web framework | Express 4 |
| Database | SQLite (better-sqlite3) |
| Template | EJS |
| Auth | bcryptjs (cost 12), express-session |
| Session store | SQLite (better-sqlite3-session-store) |

Zero client-side JS framework — HTML/CSS thuần.

## Chạy thử (Windows)

**Yêu cầu:** Node.js ≥ 18 đã cài trên máy.

```bat
git clone <repo-url>
cd cc-portal

:: Sao chép file cấu hình
copy portal\.env.example portal\.env
:: Mở portal\.env, sửa SESSION_SECRET thành chuỗi bất kỳ

:: Cài đặt + migrate + seed
install.bat

:: Khởi động
start.bat
```

Mở trình duyệt: `http://localhost:3000`

Đăng nhập bằng `admin` / password tạm được in ra lúc chạy `install.bat`.
Lần đầu đăng nhập sẽ bị yêu cầu đổi password.

### Dev mode (auto-reload)

```bat
dev.bat
```

### Backup thủ công

```bat
backup.bat
:: → backup\portal-YYYYMMDD-HHmm.db
```

## Cấu hình

Tất cả cấu hình qua file `portal/.env` (copy từ `.env.example`):

| Biến | Mặc định | Mô tả |
|---|---|---|
| `PORT` | `3000` | Cổng lắng nghe |
| `SESSION_SECRET` | — | **Bắt buộc.** Chuỗi bí mật ký cookie session |
| `SESSION_IDLE_MINUTES` | `60` | Tự đăng xuất sau bao nhiêu phút không thao tác |
| `SESSION_ABSOLUTE_HOURS` | `8` | Phiên tối đa tính bằng giờ dù có thao tác |
| `LOCK_THRESHOLD` | `5` | Số lần sai password trước khi khóa |
| `LOCK_DURATION_MINUTES` | `15` | Thời gian khóa tạm (phút) |

## Cấu trúc thư mục

```
cc-portal/
├── portal/               # Source code Node.js
│   ├── config/           # Config loader
│   ├── lib/              # db, migrate, seed, password, audit, logger
│   ├── middleware/       # session, csrf, requireLogin, requireAdmin, securityHeaders
│   ├── migrations/       # SQL migration files
│   ├── routes/           # auth, admin
│   ├── scripts/          # backup.js
│   ├── tests/
│   ├── views/            # EJS templates
│   └── server.js
├── data/                 # SQLite DB (gitignored)
├── logs/                 # Log files (gitignored)
├── backup/               # DB backups (gitignored)
├── install.bat
├── start.bat
├── dev.bat
└── backup.bat
```

## Ghi chú bảo mật

- Dự án thiết kế cho **LAN nội bộ**, không expose ra Internet.
- V1 chạy HTTP. Để bật HTTPS: sinh self-signed cert bằng OpenSSL, cập nhật `server.js` load cert + redirect HTTP→HTTPS, sau đó bật HSTS trong `middleware/securityHeaders.js`.
- `SESSION_SECRET` trong `.env` phải là chuỗi ngẫu nhiên đủ dài trước khi deploy thật (ví dụ: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

## Roadmap

- **V1.5** — Launcher mini-app (HTML thuần, Vibe Coding style)
- **V2** — Storage API cho mini-app, deploy root CA qua Active Directory GPO, 2FA cho admin
