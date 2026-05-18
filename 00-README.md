# CC Portal — Bộ tài liệu thiết kế

Đây là bộ tài liệu mô tả sản phẩm **CC Portal** — cổng thông tin nội bộ phục vụ các mini-app tại công ty chế biến xuất khẩu tôm đông lạnh.

**Phiên bản:** rev 2 — rescope V1 thuần về login + quản lý user/role; các tính năng mini-app chuyển sang V1.5+.

Bộ tài liệu này được biên soạn ở **giai đoạn thiết kế**, trước khi viết code, với mục đích:
- Thống nhất ý tưởng giữa người chủ sản phẩm và đội ngũ thực thi
- Là cơ sở để review trước khi đầu tư xây dựng
- Là tài liệu tham chiếu cho việc Vibe Coding các mini-app (từ V1.5)

## Scope theo từng chặng

| Chặng | Phạm vi chính |
|---|---|
| **V1** (sẽ build trước) | Portal website + login + quản lý user/role + admin UI |
| V1.5 | Mini-app launcher + Storage API + theo dõi online |
| V2 | Iframe, scan barcode, reverse proxy, 2FA |
| V3 | DB chung, truy xuất nguồn gốc, mobile, ERP integration |

Tài liệu mô tả toàn bộ thiết kế (V1 → V3) để đảm bảo V1 không cần breaking-change khi mở rộng. Các phần thuộc V1.5+ được đánh dấu rõ ràng.

## Cấu trúc bộ tài liệu

| File | Nội dung | Đối tượng đọc | Áp dụng cho |
|---|---|---|---|
| `00-README.md` | Tài liệu này — mục lục và hướng dẫn đọc | Tất cả | — |
| `01-functional-spec.md` | Mô tả chức năng V1 (sản phẩm làm gì ở chặng đầu) | Chủ sản phẩm, người dùng cuối | V1 |
| `02-architecture.md` | Kiến trúc kỹ thuật toàn bộ (V1 + chuẩn bị V1.5+) | Người thực thi, AI viết code | V1 → V3 |
| `03-integration-guide.md` | Hướng dẫn tích hợp mini-app với Portal | Người Vibe Code mini-app | V1.5+ |
| `04-roadmap-future.md` | Tính năng V1.5, V2, V3 và lộ trình | Chủ sản phẩm, người quy hoạch | V1.5+ |
| `05-user-guide.md` | Hướng dẫn sử dụng cho admin và user cuối | Người vận hành | V1 → |
| `templates/mini-app-template/` | Bộ template mini-app mẫu | Người Vibe Code mini-app | V1.5+ |
| `templates/PROMPT-vibe-coding.md` | Prompt chuẩn để đưa cho AI | Người Vibe Code mini-app | V1.5+ |

## Cách đọc tài liệu

**Để hiểu sản phẩm tổng thể:**
- Đọc theo thứ tự `00` → `01` → `02` → `04`

**Để bắt tay vào build V1:**
- `01-functional-spec.md` (chức năng V1)
- `02-architecture.md` mục 1-5 và 7-11 (kiến trúc, không cần đọc mini-app sections)
- `05-user-guide.md` Phần C (cài đặt IT)

**Khi tới giai đoạn V1.5 — bắt đầu có mini-app:**
- `03-integration-guide.md`
- `templates/`
- `02-architecture.md` các mục V1.5+

**Để vận hành Portal V1:**
- `05-user-guide.md` Phần A (cho nhân viên), Phần B (cho admin), Phần C (cho IT)

## Bối cảnh nhanh

- Công ty: chế biến và xuất khẩu tôm đông lạnh, 1 nhà máy
- Quy mô: 20-100 user
- Hạ tầng: server Windows nội bộ, mạng LAN nội bộ
- Triết lý: Vibe Coding ra các mini-app HTML/JS đơn giản, Portal là "launcher" tập trung
- Cách tiếp cận: làm V1 nhỏ và chắc, rồi mở rộng dần khi đã chứng minh giá trị

## Trạng thái tài liệu

- Phiên bản: rev 2 (sau review bảo mật và rescope V1)
- Mục đích hiện tại: review ý tưởng trước khi xây dựng V1
- V1 đang ở giai đoạn thiết kế — chưa có code
- Các sections V1.5+ là forward-looking — mô tả định hướng, có thể điều chỉnh khi tới gần thời điểm build

## Lưu ý khi review

Khi AI khác review tài liệu này, người review nên đánh giá:
1. **Scope V1 có vừa phải không** — có đủ để chạy trong môi trường thật, không quá nhiều để build chậm?
2. **Kiến trúc có sẵn sàng cho V1.5+ không** — schema database, role model có cần đổi khi thêm mini-app không?
3. **Các rủi ro bảo mật của V1** — auth, session, password policy có đủ chắc cho LAN nội bộ không?
4. **Tính khả thi của Vibe Coding (V1.5)** — mini-app có dễ viết bằng AI khi đã có CSP, schema, optimistic concurrency?
5. **Các điểm có thể đơn giản hóa thêm** — có chỗ nào đang overengineering cho V1 không?
