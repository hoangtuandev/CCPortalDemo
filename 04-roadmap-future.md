# 04. Tính năng tương lai và lộ trình phát triển

Tài liệu này mô tả các tính năng dự kiến cho **V2, V3** và các phiên bản sau, cùng lý do và điều kiện triển khai.

## 1. Triết lý lộ trình

CC Portal phát triển theo nguyên tắc **"đi trước rồi tối ưu sau"**:

| Giai đoạn | Mục tiêu chính | Đặc trưng |
|---|---|---|
| V1 | Thử nghiệm, sàng lọc app hiệu quả | Đơn giản tối đa, dễ Vibe Code |
| V2 | Ổn định, bảo mật chặt hơn | Embed iframe, scan barcode, ẩn URL trực tiếp |
| V3 | Trưởng thành, báo cáo liên app | DB chung, truy xuất nguồn gốc, mobile |
| V4+ | Mở rộng theo nhu cầu thực tế | Quyết định khi tới |

Nguyên tắc: **không build trước cho nhu cầu chưa được chứng minh**.

## 2. V2 — Phiên bản ổn định và an toàn hơn

### 2.1. Điều kiện kích hoạt V2

V2 chỉ bắt đầu khi V1 đã:
- Có ít nhất 3 mini-app được dùng hàng ngày
- Chạy ổn định liên tục ít nhất 3 tháng
- Người dùng đã quen với quy trình đăng nhập Portal
- Phát sinh nhu cầu thực tế từ phản hồi người dùng

### 2.2. Các tính năng V2

#### Tính năng 1: Mở mini-app trong khung Portal (iframe)

**Vấn đề V1:**
- Mini-app mở tab mới → user có cảm giác rời khỏi Portal
- Khó áp dụng UI nhất quán
- User có thể bookmark URL trực tiếp mini-app

**Giải pháp V2:**
- Click app → mini-app load vào iframe trong Portal
- Portal vẫn hiển thị header và sidebar
- URL trên thanh địa chỉ vẫn dạng `/apps/<slug>/` nhưng nằm trong khung Portal
- User cảm thấy như đang dùng 1 ứng dụng duy nhất

**Cân nhắc kỹ thuật:**
- Có thể vẫn cho phép "mở tab mới" như tùy chọn (icon góc phải)
- Mini-app cần thiết kế để chạy được cả trong iframe và standalone

#### Tính năng 2: Đăng nhập bằng scan barcode

**Vấn đề V1:**
- Công nhân xưởng phải nhớ username/password — không thực tế
- Mỗi lần đăng nhập mất thời gian

**Giải pháp V2:**
- Mỗi user có trường `barcode` riêng (đã chuẩn bị từ V1)
- Đặt kiosk có máy scan barcode ở xưởng
- Trang login có thêm chế độ "scan để đăng nhập"
- Scan thẻ nhân viên → auto-login vào tài khoản tương ứng
- Sau khi login → thấy ngay app dành cho mình

**Bảo mật:**
- Barcode đơn thuần không phải là yếu tố bảo mật mạnh
- Phù hợp cho app low-risk (xem lương, chấm công)
- Không nên dùng cho app cao cấp (thay đổi cấu hình, duyệt đơn)
- Có thể kết hợp PIN 4 số sau khi scan để tăng bảo mật

#### Tính năng 3: Chặn truy cập trực tiếp mini-app (Reverse Proxy)

**Vấn đề V1:**
- User kỹ thuật có thể truy cập trực tiếp URL mini-app
- Mini-app vẫn check session, nhưng URL bị lộ
- Khó áp dụng các chính sách network-level

**Giải pháp V2:**
- Cài Caddy hoặc nginx làm reverse proxy
- Mini-app không bind port riêng — chỉ Portal/proxy mới truy cập được
- Mọi request tới `/apps/*` đi qua proxy → Portal check session → nếu OK thì proxy đến mini-app
- URL trực tiếp tới mini-app (nếu lộ) cũng không gọi được từ ngoài

**Lưu ý:**
- Đây không phải "giấu URL" theo nghĩa che giấu
- User kỹ thuật vẫn xem được URL trong DevTools
- Nhưng kể cả biết URL cũng không truy cập được nếu không có session Portal

#### Tính năng 4: Thông báo real-time

**Mô tả:**
- Admin có thể gửi thông báo tới các user đang online
- Thông báo hiện như toast/banner trong mini-app hiện tại
- Có thể gửi cho tất cả, hoặc theo role, hoặc theo từng user

**Tình huống dùng:**
- "Hệ thống sẽ bảo trì lúc 22h, vui lòng lưu công việc"
- "App nhập liệu đã có phiên bản mới, hãy refresh trình duyệt"
- "Có đơn hàng khẩn cần duyệt — anh A vui lòng kiểm tra"

**Kỹ thuật:**
- Sử dụng Server-Sent Events (SSE) hoặc WebSocket
- Thông báo lưu vào DB, user offline khi online sẽ thấy

#### Tính năng 5: Export log ra Excel

**Vấn đề V1:**
- Log chỉ xem được trên giao diện
- Khó dùng cho báo cáo tháng, audit

**Giải pháp V2:**
- Trang xem log có nút "Xuất Excel"
- Cho phép lọc trước khi xuất (theo thời gian, user, app...)
- File Excel có format chuẩn, dễ dùng tiếp

#### Tính năng 6: User tự đổi password

**V1**: Chỉ admin mới reset password được.

**V2**: User tự đổi password của mình qua trang profile.

#### Tính năng 7: Lịch sử đăng nhập

**Mô tả:**
- User xem được 10 lần đăng nhập gần nhất của mình
- Hiển thị IP, thời gian
- Phát hiện nếu có truy cập bất thường

#### Tính năng 8: Deploy root CA qua Active Directory Group Policy

**Vấn đề V1:**
- V1 chỉ có 5-10 máy tester, cài root CA thủ công từng máy chấp nhận được.
- Khi mở rộng tới 20-100 nhân viên, cài thủ công không khả thi.
- Máy chưa trust CA → browser hiện cảnh báo "kết nối không an toàn" → user quen bấm "Proceed" → mất đi tác dụng cảnh báo bảo mật.

**Giải pháp V2:**
- Vẫn dùng đúng root CA và server cert đã sinh ở V1 — không phải đổi cert, không phải sinh lại.
- Đẩy file `ca.crt` (root CA của công ty) qua Group Policy Object trong Active Directory:
  - GPO Path: `Computer Configuration → Policies → Windows Settings → Security Settings → Public Key Policies → Trusted Root Certification Authorities`.
  - Import `ca.crt` vào đây.
  - Link GPO tới OU chứa máy nhân viên (hoặc Domain root nếu muốn áp toàn bộ).
- Mọi máy join AD: lần `gpupdate` tiếp theo (tự động trong 90 phút, hoặc reboot) sẽ tự nhận CA.
- Máy mới gia nhập domain: tự nhận ngay khi login lần đầu.

**Yêu cầu trước:**
- Công ty có Active Directory đang chạy (hỏi IT để xác nhận).
- Mọi máy nhân viên đều join domain (không phải workgroup).
- Tài khoản Domain Admin để tạo GPO.

**Nếu công ty CHƯA có Active Directory:**
- Cân nhắc dựng AD trong V2 — đầu tư một lần, nhiều lợi ích ngoài cert (quản lý user Windows tập trung, share network drive, GPO cho nhiều mục đích).
- Hoặc phương án thay thế: mua domain public + Let's Encrypt + split-DNS (tốn ~250k VND/năm cho domain, cấu hình DNS phức tạp hơn).

**Tại sao KHÔNG mua cert thương mại:**
- CA công khai (DigiCert, Sectigo...) **cấm cấp cert** cho domain `.local` và IP private từ 2015 (quy định CA/Browser Forum) — về mặt kỹ thuật không mua được.
- Mua cert đòi hỏi phải có domain public — kéo theo phức tạp split-DNS hoặc phơi server ra Internet.
- Self-signed + GPO: free, không phụ thuộc Internet, kiểm soát hoàn toàn cert lifecycle.

**Acceptance:**
- Một máy mới join domain → đăng nhập user mới → mở Portal → không thấy cảnh báo cert.
- Trong DevTools → tab Security → Certificate status: "Valid", issuer là CA của công ty.

## 3. V3 — Phiên bản trưởng thành

### 3.1. Điều kiện kích hoạt V3

V3 chỉ bắt đầu khi:
- V2 chạy ổn định ít nhất 6 tháng
- Có nhu cầu rõ ràng về báo cáo liên app
- Số lượng mini-app vượt 10, dữ liệu bắt đầu liên kết với nhau
- Có ngân sách đầu tư lớn hơn (vì sẽ tốn nhiều công migrate)

### 3.2. Database chung (DB Centralized)

**Vấn đề ở V1/V2:**
- Mỗi mini-app có DB riêng (file JSON)
- Khó báo cáo liên app
- Không có ràng buộc schema → dữ liệu dễ bị lộn xộn
- Khó truy xuất nguồn gốc (lô tôm nhập → QC → chế biến → đóng gói → xuất khẩu)

**Giải pháp V3:**
- Chuyển sang database chung (PostgreSQL hoặc SQL Server)
- Mỗi mini-app có **schema riêng** trong DB chung
- Schema được khai báo khi đăng ký app
- Portal validate dữ liệu theo schema trước khi lưu
- Vẫn giữ Storage API như V1 để mini-app cũ không phải sửa nhiều
- Bổ sung Query API để báo cáo liên app

**Migration:**
- Chấp nhận có thể phải **viết lại một số mini-app**
- Hoặc viết **app trung gian** để migrate dữ liệu JSON sang schema mới
- Mini-app phụ trợ ít quan trọng có thể bỏ luôn

### 3.3. Truy xuất nguồn gốc (Traceability)

Ngành thủy sản xuất khẩu yêu cầu truy xuất ngược: từ thành phẩm xuất đi, truy về tới nguyên liệu đầu vào và mọi công đoạn ở giữa.

**Yêu cầu:**
- Mỗi lô tôm có ID duy nhất theo dõi xuyên suốt
- Liên kết giữa các công đoạn (nhập kho → QC → chế biến → đóng gói → xuất)
- Log không thể sửa, không thể xóa
- Có thể xuất báo cáo truy xuất theo lô

**Triển khai:**
- Dựa trên DB chung của V3
- Bảng `traceability_chain` lưu mối liên kết giữa các record
- Audit log cứng (append-only)
- App "Truy xuất nguồn gốc" cho phép quản lý nhập mã lô → thấy toàn bộ chuỗi

### 3.4. Tích hợp với hệ thống ERP/lương

Công ty có thể đã có hệ thống ERP, hệ thống tính lương riêng. CC Portal cần kết nối:

**Cách tiếp cận:**
- Portal có "Connector" — thư viện kết nối hệ thống ngoài
- Mini-app gọi Connector thay vì gọi trực tiếp
- Lợi ích: thay đổi hệ thống ngoài chỉ cần sửa Connector

**Các kết nối dự kiến:**
- Hệ thống lương → app "Xem lương cá nhân"
- ERP đơn hàng → app "Theo dõi đơn hàng"
- Hệ thống cân điện tử → app "Nhập liệu cân"

### 3.5. Mobile-friendly

V1/V2 chỉ tối ưu cho PC. V3 cần:
- Layout responsive cho điện thoại
- App đặc biệt cho quản lý xem báo cáo trên di động
- Có thể là PWA (Progressive Web App) cho cài như app native

### 3.6. Sao lưu nâng cao

V1: Backup thủ công bằng Task Scheduler copy file.

V3:
- Backup tự động hàng giờ ra NAS
- Có incremental backup
- Có script restore được kiểm thử định kỳ
- Disaster recovery plan có tài liệu

## 4. Tính năng có thể cân nhắc thêm

Đây là các ý tưởng chưa quyết định, lưu lại để cân nhắc khi nhu cầu rõ hơn:

### 4.1. Audit Trail (Nhật ký kiểm toán)

- Log không thể sửa, có chữ ký số
- Phục vụ audit của khách hàng nước ngoài
- Tiêu chuẩn ISO/HACCP

### 4.2. Workflow Engine

- Mini-app có thể chuyển trạng thái qua nhiều bước
- Vd: Đơn hàng "Nháp" → "Chờ duyệt" → "Đã duyệt" → "Đang sản xuất" → "Đã giao"
- Mỗi bước có người chịu trách nhiệm
- Có thể trigger thông báo tự động

### 4.3. Đa ngôn ngữ

- Hỗ trợ tiếng Anh cho user nước ngoài
- Hỗ trợ tiếng Trung/Nhật/Hàn (nếu có khách hàng các nước này)

### 4.4. Single Sign-On với Active Directory

- Login bằng tài khoản Windows của công ty
- Không cần quản lý password riêng cho Portal
- Phù hợp công ty đã có AD/LDAP

### 4.5. Mobile app native

- App iOS/Android cài trên điện thoại
- Quan trọng cho quản lý đi công tác
- Có thể chỉ là wrapper của web Portal

### 4.6. Tích hợp máy in nhãn

- App QC in nhãn cho lô tôm sau kiểm tra
- App đóng gói in mã vạch carton
- Cần driver máy in từng loại

### 4.7. Dashboard số liệu trực quan

- App "BI Dashboard" tổng hợp số liệu từ nhiều mini-app
- Biểu đồ sản lượng, doanh thu, hiệu suất
- Lọc theo thời gian, sản phẩm, công đoạn

### 4.8. Two-Factor Authentication (2FA)

- Bắt buộc cho admin
- Tùy chọn cho user thường
- Có thể dùng Google Authenticator hoặc OTP qua tin nhắn

### 4.9. AI Assistant trong Portal

- Chatbot trả lời câu hỏi về cách dùng app
- Tự động phát hiện bất thường trong dữ liệu
- Đề xuất app phù hợp khi user mô tả vấn đề

### 4.10. Tích hợp với Zalo OA / WhatsApp Business

- Thông báo qua Zalo cho công nhân (vì đa số dùng Zalo)
- Báo cáo hàng ngày tự động cho quản lý qua Zalo

## 5. Những tính năng đã được cân nhắc nhưng KHÔNG đưa vào

Lưu lại để tránh sau này quên lý do:

### 5.1. Hỗ trợ làm việc offline

**Lý do không:** Portal chạy trong LAN, mất kết nối LAN thì cả công ty mất việc. Đầu tư cho offline không cân xứng với rủi ro.

### 5.2. Mỗi user có nhiều role đồng thời

**Lý do không:** Phức tạp hóa logic phân quyền. Nếu cần user có nhiều quyền → tạo role gộp.

### 5.3. Phân quyền theo từng record (row-level security)

**Lý do không:** Quá phức tạp cho quy mô hiện tại. Nếu cần cô lập dữ liệu giữa user → tự xử lý ở mini-app (lưu `created_by` và filter).

### 5.4. Cluster / High Availability (HA)

**Lý do không:** Một nhà máy chỉ cần 1 server. HA tăng chi phí gấp đôi mà ít khi dùng đến. Chấp nhận downtime ngắn khi bảo trì.

### 5.5. Microservices

**Lý do không:** Quy mô không đủ lớn. Monolithic đơn giản phù hợp hơn.

### 5.6. GraphQL API

**Lý do không:** Mini-app HTML thuần dùng REST đơn giản hơn nhiều.

## 6. Tổng hợp lộ trình

| Mốc thời gian | Phiên bản | Tính năng chính |
|---|---|---|
| Tháng 1-3 | V1 setup | Build Portal, viết 2-3 mini-app đầu tiên |
| Tháng 3-6 | V1 sử dụng | Mở rộng số mini-app, sàng lọc app hiệu quả |
| Tháng 6-9 | V2 phát triển | Iframe, scan barcode, reverse proxy |
| Tháng 9-12 | V2 sử dụng | Tích hợp sâu hơn, thêm tính năng tiện ích |
| Năm 2 | V3 cân nhắc | Đánh giá có cần DB chung, traceability không |
| Năm 2-3 | V3 phát triển | Migrate sang DB chung, mobile, ERP integration |

Lưu ý: lộ trình này là dự kiến. Quyết định cuối cùng dựa trên hiệu quả thực tế của từng giai đoạn.

## 7. Quy tắc quyết định khi nâng cấp

Trước khi đưa 1 tính năng vào lộ trình, đặt 3 câu hỏi:

**1. Có giải quyết vấn đề thực tế đang gặp không?**
- Nếu chỉ "có thì hay" → để vào danh sách chờ
- Nếu nhân viên đang đau đầu vì thiếu nó → ưu tiên

**2. Mức độ phức tạp có cân xứng với lợi ích không?**
- Lợi ích nhỏ nhưng phức tạp lớn → bỏ qua
- Lợi ích rõ ràng, phức tạp chấp nhận được → làm

**3. Có ảnh hưởng đến triết lý gọn nhẹ của Portal không?**
- Tính năng làm Portal nặng, chậm → cân nhắc làm thành mini-app riêng thay vì nhét vào Portal
- Tính năng phá vỡ pattern hiện có → cần thiết kế lại cẩn thận

---

**Kết luận:** CC Portal sinh ra để **giải quyết bài toán cụ thể** chứ không phải để trở thành một sản phẩm hoành tráng. Mọi quyết định nâng cấp đều phải bám vào nhu cầu thực tế của công ty chế biến xuất khẩu tôm — không phải vì "công nghệ này hay" mà nâng cấp.
