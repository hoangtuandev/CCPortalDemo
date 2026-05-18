# 05. Hướng dẫn sử dụng CC Portal

Tài liệu này dành cho **người vận hành Portal** (admin) và **người dùng cuối** (nhân viên).

**Phiên bản:** rev 2 — rescope theo V1 (login + quản lý user/role); các nội dung mini-app chuyển sang V1.5+.

Tài liệu chia thành 3 phần:
- **Phần A** — dành cho nhân viên (người dùng cuối)
- **Phần B** — dành cho quản trị viên (admin)
- **Phần C** — dành cho IT/người quản lý server

> **Lưu ý về V1:** V1 chỉ gồm chức năng đăng nhập và quản lý user/role. Các tính năng mini-app (mở app, lưu dữ liệu, theo dõi online...) sẽ có từ V1.5. Phần B và A của tài liệu này được viết cho V1; các mục V1.5+ được đánh dấu rõ.

---

## Phần A: Dành cho nhân viên

### A.1. Truy cập Portal

**Bước 1:** Mở trình duyệt (Chrome, Edge hoặc Firefox)

**Bước 2:** Gõ địa chỉ Portal vào thanh địa chỉ. Địa chỉ này do công ty cung cấp, ví dụ:
- `https://portal.cc-seafood.local`
- Hoặc `https://192.168.1.100`

Lần đầu truy cập có thể trình duyệt báo "kết nối không an toàn" — đây là do dùng self-signed certificate trong LAN. IT công ty sẽ hướng dẫn cài root certificate hoặc cho phép truy cập trang.

**Bước 3:** Trang đăng nhập hiện ra

**Mẹo:** Bookmark trang Portal vào trình duyệt để lần sau truy cập nhanh.

### A.2. Đăng nhập lần đầu

1. Liên hệ quản trị viên để được cấp tài khoản và **mật khẩu tạm**
2. Vào trang Portal → nhập username + mật khẩu tạm
3. Hệ thống sẽ **bắt buộc đổi mật khẩu** trước khi vào dashboard
4. Đặt mật khẩu mới đáp ứng các yêu cầu:
   - Tối thiểu 10 ký tự
   - Có ít nhất 1 chữ và 1 số
   - Không trùng với username
5. Sau khi đổi password, vào dashboard

### A.3. Đăng nhập các lần sau

1. Vào trang Portal
2. Nhập username + password (mới)
3. Click "Đăng nhập"

**Quên mật khẩu:**
- Liên hệ quản trị viên để reset
- Sau khi reset, đăng nhập bằng password tạm → hệ thống lại bắt buộc đổi password
- (V2 có thể có chức năng tự reset qua email/Zalo)

**Sai mật khẩu nhiều lần:**
- Sai 5 lần liên tiếp trong 15 phút → tài khoản bị khóa tạm thời 15 phút
- Đợi 15 phút hoặc nhờ admin mở khóa sớm

### A.4. Dashboard sau đăng nhập (V1)

Trong V1, dashboard hiển thị:
- Lời chào kèm họ tên của bạn
- Vai trò hiện tại của bạn
- Thông báo: các tính năng ứng dụng đang phát triển
- Các link: Đổi mật khẩu, Đăng xuất
- Nếu bạn là admin: thêm link "Khu vực quản trị"

Trong V1.5+, dashboard sẽ hiển thị danh sách các mini-app bạn được phép sử dụng.

### A.5. Đổi mật khẩu

1. Trên dashboard → click "Đổi mật khẩu"
2. Nhập mật khẩu hiện tại
3. Nhập mật khẩu mới (2 lần để xác nhận)
4. Click "Lưu"
5. Sau khi đổi xong, các phiên đăng nhập khác của bạn (nếu có trên máy khác) sẽ bị đăng xuất

**Khi nào nên đổi mật khẩu:**
- Định kỳ 3-6 tháng/lần
- Khi nghi ngờ bị lộ
- Khi vừa đăng nhập trên máy lạ

### A.6. Đăng xuất

**Cách đăng xuất chủ động:**
- Click vào tên bạn ở góc phải header → chọn "Đăng xuất"
- Hoặc click link "Đăng xuất" trên dashboard

**Khi nào nên đăng xuất:**
- Khi rời máy lâu (đi họp, nghỉ trưa)
- Khi kết thúc ca làm việc
- Khi dùng máy chung

**Tự động đăng xuất:**
- Sau 1 giờ không thao tác → phiên bị đăng xuất tự động (idle timeout)
- Sau 8 giờ kể từ lúc đăng nhập → phiên hết hạn dù vẫn đang thao tác (absolute timeout)
- Cần đăng nhập lại

### A.7. Lưu ý bảo mật

**Mật khẩu:**
- Không chia sẻ mật khẩu với bất kỳ ai, kể cả đồng nghiệp thân hoặc cấp trên
- Không ghi mật khẩu lên giấy dán ở màn hình
- Đổi mật khẩu nếu nghi ngờ bị lộ

**Tài khoản:**
- Mọi hành động trên Portal được ghi log theo tên tài khoản
- Nếu ai đó dùng tài khoản của bạn → bạn sẽ bị quy trách nhiệm
- Luôn đăng xuất khi rời máy

**Báo cáo sự cố:**
- Nếu thấy hệ thống có biểu hiện lạ → báo admin ngay
- Nếu phát hiện tài khoản bị lộ → báo admin để khóa và đổi mật khẩu

### A.8. Sự cố thường gặp

| Tình huống | Cách xử lý |
|---|---|
| "Phiên đăng nhập đã hết" | Đăng nhập lại |
| "Tài khoản tạm thời bị khóa" | Đợi 15 phút hoặc liên hệ admin mở khóa |
| "Tài khoản không hoạt động" | Tài khoản bị admin khóa, liên hệ admin để biết lý do |
| "Mật khẩu không đáp ứng yêu cầu" | Đảm bảo ≥10 ký tự, có chữ và số, không trùng username |
| "Không kết nối được Portal" | Kiểm tra máy có vào mạng LAN không, báo IT nếu vẫn không vào được |
| Trình duyệt báo "kết nối không an toàn" | Lần đầu bình thường (self-signed cert) — liên hệ IT cài root cert |

---

## Phần B: Dành cho quản trị viên (Admin)

### B.1. Đăng nhập vào khu vực quản trị

1. Đăng nhập Portal bằng tài khoản admin
2. Trên header hoặc dashboard sẽ thấy link "Khu vực quản trị" (chỉ admin mới thấy)
3. Click để vào dashboard quản trị

### B.2. Tổng quan dashboard quản trị (V1)

Dashboard hiển thị:
- **Tổng số user**: đang hoạt động / bị khóa
- **Tổng số role**
- **Số lần đăng nhập hôm nay**: thành công / thất bại
- **10 sự kiện log gần nhất**

Từ dashboard có thể vào các trang quản lý chi tiết qua sidebar bên trái.

*(V1.5 sẽ thêm: số mini-app, số user online real-time, biểu đồ hoạt động).*

### B.3. Quản lý tài khoản

**Tạo tài khoản mới:**
1. Vào trang "Tài khoản"
2. Click "Thêm tài khoản"
3. Điền:
   - Username (chỉ chữ thường, số, gạch ngang)
   - Họ tên đầy đủ
   - Mật khẩu tạm (tối thiểu 10 ký tự, có chữ + số)
   - Vai trò (chọn từ danh sách role có sẵn)
   - Barcode (tùy chọn, dùng cho V2)
4. Click "Tạo" → hệ thống tự set cờ "buộc đổi password lần đầu"
5. Cung cấp username + mật khẩu tạm cho nhân viên qua kênh ngoài (Zalo, in giấy...)
6. Nhân viên đăng nhập lần đầu sẽ bị bắt đổi password

**Khóa tài khoản:**
- Khi nhân viên nghỉ việc hoặc tạm nghỉ
- Trên hàng user → click icon khóa
- User bị khóa không đăng nhập được nhưng dữ liệu và log vẫn giữ

**Mở khóa (do nhân viên đã hoạt động lại):**
- Click lại icon mở khóa

**Mở khóa tạm thời (do user nhập sai password nhiều lần):**
- Trên hàng user → bỏ trạng thái "khóa tạm"
- Hoặc đợi đủ 15 phút thì hệ thống tự mở

**Reset mật khẩu:**
- Khi user quên password
- Click icon chìa khóa → nhập mật khẩu tạm mới
- Hệ thống tự set cờ "buộc đổi password lần sau"
- Báo password tạm cho user qua kênh ngoài

**Đổi vai trò:**
- Khi nhân viên chuyển bộ phận
- Sửa user → đổi role
- Quyền truy cập (V1.5+) sẽ thay đổi theo

**Xóa tài khoản:**
- Chỉ xóa được nếu user chưa từng đăng nhập / chưa có log nào
- Với user đã có hoạt động → chỉ được khóa, không xóa (để giữ log)

### B.4. Quản lý vai trò (Role)

**Khi nào cần tạo role:**
- Khi có nhóm nhân viên có chức năng đặc biệt
- Ví dụ: "Admin", "Quản lý", "QC", "Sản xuất", "Công nhân"

Trong V1 chỉ cần role để phân biệt giữa admin (vào được trang quản trị) và non-admin. Từ V1.5 role sẽ được dùng để cấp quyền dùng mini-app.

**Tạo role:**
1. Vào trang "Vai trò"
2. Click "Thêm vai trò"
3. Điền:
   - Mã kỹ thuật (chỉ chữ thường, số, gạch dưới)
   - Tên hiển thị (tiếng Việt có dấu được)
   - Mô tả
   - Tick "Có quyền truy cập trang quản trị" nếu role này được làm admin
4. Lưu

**Sửa role:**
- Có thể đổi tên hiển thị, mô tả, cờ admin
- **Không** đổi được mã kỹ thuật (để giữ tham chiếu nhất quán)

**Xóa role:**
- Chỉ xóa được khi **không có user nào** thuộc role này
- Trước khi xóa: chuyển user sang role khác

**Quy tắc bảo vệ hệ thống:**
- Luôn phải có ít nhất 1 user admin đang active
- Hệ thống chặn các thao tác làm vi phạm: không khóa được admin cuối cùng, không hạ role admin cuối cùng

**Lưu ý:** Không nên tạo quá nhiều role giống nhau, cố gắng gộp lại.

### B.5. Xem nhật ký hoạt động

**Trang "Nhật ký":**
- Hiển thị các sự kiện trong hệ thống
- Lọc theo: username, loại hành động, khoảng thời gian
- Sắp xếp mới nhất trên cùng
- Phân trang

**Các loại sự kiện V1:**

| Action | Ý nghĩa |
|---|---|
| `login` | Đăng nhập thành công |
| `login_failed` | Đăng nhập thất bại (có lý do: sai password / user khóa / tạm khóa) |
| `logout` | Đăng xuất chủ động |
| `session_expired` | Phiên tự hết hạn |
| `password_changed` | Đổi password (chủ động hoặc bị reset) |
| `admin_user_created` | Admin tạo user |
| `admin_user_modified` | Admin sửa user (đổi role, khóa, mở...) |
| `admin_role_created` | Tạo role |
| `admin_role_modified` | Sửa role |
| `admin_role_deleted` | Xóa role |

*(V1.5 sẽ thêm: `open_app`, `access_denied`, `data_read`, `data_write`...)*

**Cách dùng nhật ký:**

*Kiểm tra ai đã làm gì:* lọc theo username → xem các hành động gần đây

*Phát hiện bất thường:* lọc theo `login_failed` → kiểm tra có ai đang thử đăng nhập sai nhiều lần không

*Audit thay đổi quản trị:* lọc theo các action `admin_*` → xem ai đã thay đổi gì

### B.6. Cấu hình hệ thống (nếu có UI)

Một số tham số có thể chỉnh qua giao diện thay vì sửa file config:
- Idle timeout (mặc định 60 phút)
- Absolute session timeout (mặc định 8 giờ)
- Số lần nhập sai trước khi khóa (mặc định 5)
- Thời gian khóa tạm (mặc định 15 phút)

Nếu V1 chưa có UI này → chỉnh trong file `portal/config.json` và restart Portal.

### B.7. Khi nhân viên báo lỗi

**Bước 1: Thu thập thông tin**
- Hỏi nhân viên: username, thao tác đã làm, thông báo lỗi gì
- Xin screenshot nếu có

**Bước 2: Xem log**
- Vào trang "Nhật ký"
- Lọc theo username và thời gian gần đây
- Tìm dòng phù hợp

**Bước 3: Xử lý**
- Quên password: reset (mục B.3)
- Tài khoản tạm khóa: mở khóa hoặc đợi 15 phút
- Lỗi đăng nhập lạ: kiểm tra IP trong log, có thể có ai đó cố đăng nhập trái phép
- Lỗi hệ thống: báo IT

### B.8. Các tác vụ V1.5+ (chưa có ở V1)

Khi nâng cấp lên V1.5, admin sẽ làm thêm:
- Đăng ký và quản lý mini-app
- Cấp quyền cho role dùng từng app
- Theo dõi user online real-time
- Review mini-app trước khi promote từ beta sang stable

Chi tiết xem `04-roadmap-future.md` và (khi tới V1.5) bản cập nhật của tài liệu này.

---

## Phần C: Dành cho IT / Người quản lý server

### C.1. Cài đặt lần đầu

**Yêu cầu hệ thống:**
- Server Windows Server 2016+ hoặc Windows 10/11
- 2GB RAM trở lên
- 20GB ổ đĩa trống
- Mạng LAN ổn định

**Bước cài đặt:**

1. **Cài Node.js:**
   - Tải Node.js LTS từ trang chủ
   - Chạy file `.msi`, click Next-Next-Finish

2. **Copy code Portal:**
   - Copy toàn bộ folder `cc-portal/` vào server
   - Vị trí gợi ý: `C:\cc-portal\`

3. **Chạy install lần đầu:**
   - Double-click file `install.bat`
   - Script tự cài npm packages, khởi tạo database, sinh self-signed certificate

4. **Khởi động Portal:**
   - Chế độ thử nghiệm: chạy `start.bat`, cửa sổ CMD sẽ mở và hiển thị log
   - Chế độ chính thức: chạy `install-as-service.bat` (cần quyền Administrator), Portal sẽ tự khởi động cùng Windows

5. **Mở firewall:**
   - Mở Windows Defender Firewall
   - Inbound Rules → New Rule → Port → TCP 443 → Allow
   - (Nếu cần redirect HTTP → HTTPS: cũng mở thêm 80)

6. **Phân phối root certificate:**
   - File root CA được sinh trong folder `cert/`
   - Phân phối lên các máy nhân viên qua Group Policy (nếu có AD Windows) hoặc cài thủ công
   - Mục đích: trình duyệt không cảnh báo "kết nối không an toàn"

7. **Kiểm tra:**
   - Trên server: mở trình duyệt, vào `https://localhost`
   - Trên máy khác trong LAN: vào `https://<IP-server>`
   - Đăng nhập bằng tài khoản admin mặc định (xem `install.bat` output)
   - **Hệ thống sẽ bắt buộc đổi mật khẩu admin ngay** — đổi một password mạnh, ghi nhớ kỹ

### C.2. Đặt domain nội bộ (khuyến nghị)

Để nhân viên không phải gõ IP và để certificate hoạt động đúng:

**Cách 1: Sửa file hosts trên từng máy (đơn giản, ít máy)**
- Mở `C:\Windows\System32\drivers\etc\hosts` bằng Notepad (Administrator)
- Thêm dòng: `192.168.1.100  portal.cc-seafood.local`
- Lưu file

**Cách 2: Cấu hình DNS server công ty (chuyên nghiệp, nhiều máy)**
- Vào DNS server công ty (thường có sẵn nếu có domain Windows)
- Thêm A record: `portal.cc-seafood.local` → `192.168.1.100`
- Toàn bộ máy trong domain tự nhận

Sinh self-signed cert sử dụng domain này (`portal.cc-seafood.local`) — không phải IP.

### C.3. Sao lưu định kỳ

**Quan trọng:** SQLite đang chạy không được copy file trực tiếp bằng `xcopy` — file có thể corrupt. Phải dùng **SQLite backup API**.

**Sao lưu thủ công (khi cần ngay):**
- Mở CMD, vào folder Portal
- Chạy: `node -e "require('better-sqlite3')('data/portal.db').backup('backup/portal-manual.db')"`
- Hoặc dùng `sqlite3.exe data/portal.db ".backup backup/portal-manual.db"`

**Sao lưu tự động bằng Task Scheduler:**

1. Tạo file `backup.bat` trong folder Portal:
   ```
   @echo off
   set DATE_STR=%date:~6,4%%date:~3,2%%date:~0,2%
   sqlite3.exe C:\cc-portal\data\portal.db ".backup C:\cc-portal\backup\portal-%DATE_STR%.db"
   ```

2. Mở Task Scheduler trên server, tạo task mới:
   - Tên: "CC Portal Backup Daily"
   - Trigger: Daily, lúc 0:00
   - Action: Start a program → chỉ tới `backup.bat`
3. Lưu

**Khuyến nghị:**
- Giữ 30 ngày backup gần nhất, xóa file cũ hơn
- Định kỳ copy backup ra ổ đĩa rời (USB, ổ ngoài) hoặc NAS
- Test phục hồi backup định kỳ 3-6 tháng/lần để đảm bảo backup có thể dùng được

### C.4. Khôi phục khi sự cố

**Khi Portal không khởi động được:**

1. Mở CMD trên server, vào folder `cc-portal\portal\`
2. Chạy `node server.js` để xem lỗi
3. Các lỗi thường gặp:
   - Port 443 bị chiếm: dừng tiến trình khác hoặc đổi port
   - File database bị hỏng: phục hồi từ backup
   - Thiếu npm package: chạy lại `npm install`
   - Certificate hết hạn: sinh lại

**Khi database bị hỏng:**

1. Dừng Portal (qua PM2/Service hoặc Task Manager)
2. Đổi tên file `data\portal.db` thành `portal.db.broken`
3. Copy file backup mới nhất vào: `copy backup\portal-YYYYMMDD.db data\portal.db`
4. Khởi động lại Portal
5. Kiểm tra dữ liệu (login với tài khoản admin, vào trang user/log)

**Khi server hỏng hoàn toàn:**

1. Chuẩn bị server mới (Windows + Node.js)
2. Copy folder `cc-portal\` từ backup vào server mới
3. Sinh lại certificate hoặc copy certificate cũ
4. Cấu hình IP/domain trỏ về server mới
5. Khởi động Portal
6. Test đăng nhập, kiểm tra dữ liệu

### C.5. Cập nhật phiên bản Portal

Khi có phiên bản Portal mới (vd nâng cấp từ V1 lên V1.5):

1. Backup folder `data\` (đề phòng rollback) — dùng SQLite backup API
2. Dừng Portal đang chạy
3. Backup folder `portal\` cũ (đề phòng rollback code)
4. Copy code mới đè lên folder `portal\`
5. Chạy `cd portal && npm install` (cài dependency mới nếu có)
6. Chạy migration nếu có thay đổi schema database
7. Khởi động Portal
8. Test các chức năng chính
9. Nếu lỗi → rollback bằng cách phục hồi folder cũ và file DB

### C.6. Giám sát hoạt động

**Kiểm tra Portal có chạy không:**
- Mở trình duyệt vào địa chỉ Portal → có hiện trang đăng nhập không

**Xem log server:**
- Nếu chạy bằng PM2: `pm2 logs cc-portal`
- Nếu chạy bằng start.bat: xem log trong cửa sổ CMD
- File log: trong folder `logs/`

**Kiểm tra tài nguyên:**
- Task Manager → xem RAM và CPU của tiến trình `node.exe`
- Nếu tiêu thụ bất thường → khởi động lại Portal

**Theo dõi kích thước database:**
- Folder `data\`: xem dung lượng
- Nếu vượt 1GB → cân nhắc archive log cũ
- Nếu vượt 5GB → cân nhắc migrate sang database mạnh hơn

### C.7. Bảo trì định kỳ

**Hàng ngày (tự động):**
- Backup database

**Hàng tuần:**
- Kiểm tra log lỗi server
- Kiểm tra dung lượng ổ đĩa
- Restart Portal nếu cần (giải phóng RAM)

**Hàng tháng:**
- Xem báo cáo hoạt động: số user, số log login_failed
- Cập nhật Windows nếu có patch quan trọng
- Test khôi phục từ backup

**Hàng quý:**
- Đánh giá hiệu năng Portal
- Review danh sách user, khóa user đã nghỉ việc
- Kiểm tra certificate sắp hết hạn (self-signed thường 1-2 năm)

### C.8. Bảo mật server

**Khuyến nghị tối thiểu:**
- Mật khẩu Windows mạnh cho tài khoản Administrator
- Cài antivirus
- Cập nhật Windows định kỳ
- Không cài phần mềm không rõ nguồn gốc
- Chỉ mở các port cần thiết trên firewall (443 cho Portal, 3389 cho RDP nếu cần)
- Disable tài khoản Guest
- HTTPS đã bật mặc định ở V1

**Nâng cao (V2):**
- Trust certificate qua AD Group Policy thay vì cài thủ công
- 2FA cho tài khoản Administrator Windows
- Audit log Windows Event
- VPN cho truy cập từ xa (nếu cần)
- Reverse proxy (Caddy/nginx) trước Portal

### C.9. Liên hệ hỗ trợ kỹ thuật

Khi gặp vấn đề ngoài khả năng xử lý:

**Thông tin cần chuẩn bị:**
- Mô tả vấn đề
- Thời điểm xảy ra
- Log lỗi (copy từ CMD hoặc PM2)
- Screenshot nếu có
- Phiên bản Portal đang chạy

**Kênh liên hệ:**
- (Sẽ được điền sau khi có đội triển khai)
