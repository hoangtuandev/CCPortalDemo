# Kickoff prompt — paste vào Claude Code khi bắt đầu build V1

Mở Claude Code trong VSCode tại folder `CC Portal/` (folder hiện tại có sẵn 00-05 và progress.md). Paste nguyên đoạn sau vào chat đầu tiên:

---

```
Chào Claude. Hôm nay là buổi đầu tiên build dự án CC Portal V1.

BỐI CẢNH:
- Folder hiện tại đang chứa tài liệu thiết kế đã hoàn chỉnh.
- File CLAUDE.md ở root chứa rule giao tiếp + 4 principles bắt buộc tuân thủ (Claude Code đã auto-load file này).
- File progress.md ở root chia toàn bộ V1 thành 40 task, mỗi task vừa 1 session.
- Code V1 sẽ được tạo TRONG folder này, ở subfolder `portal/` theo đúng cấu trúc đã quy định trong 02-architecture.md mục 3.

VIỆC CẦN LÀM HÔM NAY: chỉ task P0.1 trong progress.md (Khởi tạo Node.js project + dependency).

QUY TRÌNH BẮT BUỘC:

Bước 1 — Đọc trước khi làm (rule B.1 Think before coding):
- Đọc @CLAUDE.md
- Đọc @progress.md — chú ý task P0.1 và toàn bộ phase P0
- Đọc @02-architecture.md — chỉ mục 2 (stack) và mục 3 (cấu trúc thư mục)

Bước 2 — Đề xuất plan trước khi code:
- Liệt kê các package npm dự định cài kèm version cụ thể
- Đánh giá rủi ro từng package theo rule A.3 trong CLAUDE.md:
  - Publisher / repo chính thức?
  - Số dependency transitive (đại khái)?
  - Có postinstall script đáng ngờ không?
  - Maintained gần đây không?
- Đề xuất nội dung package.json, .gitignore, eslint config tối thiểu
- DỪNG LẠI chờ tôi confirm

Bước 3 — Sau khi tôi confirm:
- Tạo các file cần thiết trong portal/
- Chạy npm install
- Verify bằng acceptance criteria của P0.1 trong progress.md: chạy `node -e "console.log('ok')"` từ portal/ ra "ok"

Bước 4 — Đóng task:
- Sửa progress.md: đổi `P0.1. [ ]` thành `P0.1. [x]`, thêm ngày + 1-2 dòng note nếu cần
- Báo cáo: đã tạo những file gì, npm install ra bao nhiêu package, có cảnh báo gì không
- KHÔNG tự động làm tiếp P0.2 — đợi tôi mở session sau

RÀNG BUỘC:
- Trả lời tiếng Việt, thuật ngữ kỹ thuật giữ tiếng Anh (rule A.1)
- Không xóa file nào nếu chưa hỏi tôi (rule A.2)
- Không install package nếu chưa qua bước 2 + confirm của tôi (rule A.3)
- Sửa minimum để hoàn thành task, không refactor/format ngoài scope (rule B.3)

Bắt đầu Bước 1. Sau khi đọc xong các file, tóm tắt cho tôi trong 5 dòng:
1. P0.1 cần làm gì cụ thể
2. Acceptance criteria là gì
3. Có blocker / unclear gì không
4. Stack đã chốt trong 02-architecture.md mục 2 gồm những gì
5. Bạn dự định làm theo thứ tự nào

Rồi mới sang Bước 2.
```

---

## Ghi chú khi dùng prompt này

**Trước khi paste:**
- Mở terminal trong VSCode, `cd` vào folder `CC Portal/`.
- Khởi động Claude Code (nếu CLI: gõ `claude` trong terminal).
- Đảm bảo Claude Code nhận folder hiện tại — kiểm tra file CLAUDE.md tự load (Claude sẽ chào kèm nhắc rule).

**Sau khi paste:**
- Claude sẽ đọc các file rồi tóm tắt 5 điểm.
- Đọc kỹ tóm tắt — nếu thấy Claude hiểu sai → sửa ngay trước khi nó đề xuất package.
- Bước 2 (package list + risk): xem từng package, nếu thấy lạ → google + check trên npmjs.com (downloads, maintained?). Đừng confirm nếu chưa yên tâm.
- Bước 3 (install): xem output `npm install`. Nếu có cảnh báo `deprecated` hoặc `audit` → hỏi Claude giải thích.

**Cho session sau (P0.2, P0.3, ...):**
- Mở Claude Code mới, paste prompt tương tự — chỉ thay `P0.1` → `P0.2` và phần "Bước 1 — Đọc trước khi làm" liệt kê mục cần đọc khác (xem bảng "Tài liệu tham chiếu cho từng phase" cuối progress.md).
- Hoặc viết template prompt riêng nếu muốn — sẽ làm trong session khác.

**Nếu Claude vi phạm rule:**
- Dừng ngay, nhắc rule cụ thể (vd: "Bạn vừa định install package mà chưa qua bước rủi ro — đọc lại rule A.3").
- Yêu cầu rollback file đã sửa nếu cần.

**Đánh dấu task xong:**
- Verify bằng tay acceptance criteria, không tin Claude báo "done".
- Mới đổi `[ ]` → `[x]` trong progress.md.
