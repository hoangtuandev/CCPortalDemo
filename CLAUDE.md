# CLAUDE.md — Quy ước làm việc với Claude trên dự án CC Portal

File này là **hệ quy chiếu** cho mọi session làm việc giữa Ben và Claude trên repo CC Portal.
Claude phải đọc file này TRƯỚC khi đụng vào bất kỳ file nào khác.

---

## A. Rule giao tiếp (3 rule cứng)

### A.1. Ngôn ngữ
- Claude **trả lời chủ yếu bằng tiếng Việt**.
- Thuật ngữ chuyên ngành giữ nguyên tiếng Anh: `session`, `endpoint`, `schema`, `CSP`, `optimistic concurrency`, `bcryptjs`, `hash`, `slug`, `commit`, `PR`, `migration`...
- Không dịch tên file, tên biến, tên hàm, mã lỗi (vd giữ `VERSION_CONFLICT` thay vì "lỗi version").
- Code, log message, error message trong code: tiếng Anh hoặc theo convention của ngôn ngữ.

### A.2. Không tự động xóa file
- Claude **không xóa** bất kỳ file/folder nào (kể cả file tạm, file cũ, file backup) nếu chưa có **confirmation rõ ràng** từ Ben.
- Khi cần xóa: phải hỏi trước, liệt kê file định xóa, đợi user confirm rồi mới xóa.
- Áp dụng cả với: file trong outputs tạm, file `.bak`, file orphan, log cũ.
- Ngoại lệ duy nhất: file Claude vừa tạo trong cùng turn, được user yêu cầu undo ngay sau đó.

### A.3. Check rủi ro trước khi install
- Trước khi install bất cứ thứ gì lên hệ thống (npm package, Python package, extension, binary, system tool, MCP server, plugin), Claude phải:
  1. Liệt kê tên package + phiên bản dự kiến cài.
  2. Đánh giá nhanh: nguồn gốc (publisher, repo chính thức?), số lượng dependency, downloads/stars, có maintained không.
  3. Cảnh báo rủi ro nếu có: supply chain attack, malware history, postinstall script, network access, file system access ngoài project, leaked credentials.
  4. **Đợi confirmation** rồi mới chạy install.
- Áp dụng cho: `npm install`, `pip install`, `pnpm add`, `yarn add`, `winget install`, `choco install`, MCP install, plugin install.
- Không áp dụng cho: chạy script đã có sẵn trong repo (vd `npm run dev`), chạy command đọc-only (`ls`, `git status`).

---

## B. 4 nguyên tắc cốt lõi khi triển khai

Mọi quyết định code/architecture trong dự án này phải bám 4 principles dưới đây.
Khi Claude thấy yêu cầu của user vi phạm 1 trong 4, Claude **phải nói ra** và đề xuất phương án thay thế.

### B.1. Think before coding
- Đọc tài liệu thiết kế (`01` → `05`) và hiểu **why** trước khi viết code.
- Hỏi lại nếu yêu cầu mơ hồ, đặc biệt khi đụng vào: schema DB, auth, phân quyền, Storage API contract.
- Trước task lớn (> 1 file mới hoặc > 100 dòng code), viết **plan ngắn** (3-5 gạch đầu dòng) cho Ben review trước.

### B.2. Simplicity first
- Chọn giải pháp đơn giản nhất chạy được. Không over-engineer.
- Không thêm dependency nếu chuẩn library / 20 dòng code làm được.
- Không thêm tính năng "có cũng được" — chỉ build cái đã có trong spec.
- Nếu một file > 1000 dòng → cân nhắc tách. Nếu một function > 50 dòng → cân nhắc split.

### B.3. Surgical changes
- Sửa chỗ cần sửa, không refactor vô tội vạ.
- Không format lại file cũ chỉ để "đẹp hơn" — diff phải tập trung vào nội dung thực sự thay đổi.
- Không xóa code chết trong cùng PR với feature mới — tách PR riêng.
- Một commit = một thay đổi logic rõ ràng.

### B.4. Goal-driven execution
- Mỗi task phải có **deliverable cụ thể** và **acceptance criteria**.
- Nếu task có thể chia nhỏ → chia nhỏ. Mỗi sub-task chạy được độc lập, test được độc lập.
- Trước khi mark "done" → tự verify: chạy thử, đọc lại diff, test edge case.
- Không claim "xong" khi mới chỉ "code chạy không lỗi" — phải đạt được mục tiêu nghiệp vụ.

---

## C. Quy ước về Markdown trong repo này

- Heading style: dùng `# `, `## `, `### ` chuẩn ATX (không gạch dưới).
- Một file: tối đa **1000 dòng**. Vượt → tách thành nhiều file số thứ tự (vd `03a-...`, `03b-...`).
- Code block luôn có ngôn ngữ: ```` ```javascript `````, ```` ```bash `````, ```` ```sql `````.
- Bảng dùng khi so sánh ≥ 2 chiều. So sánh 1 chiều dùng bullet list.
- Mỗi file có header phiên bản ở dòng 2-3: `**Phiên bản:** rev N — mô tả thay đổi chính.`
- Khi sửa file: cập nhật phiên bản, không xóa lịch sử rev cũ ở đâu đó (giữ trong git log).

---

## D. Khi review tài liệu cho dự án này

- Bám style của Karpathy ở các phần thiên về dev/AI (mục 03, notes-for-ai, PROMPT): ngắn, code-first, ít fluff, ví dụ cụ thể.
- Phần spec/operations (01, 04, 05): vẫn cần formal, có structure, có table — không ép Karpathy style ở đây.
- Cắt bớt phần lặp lại giữa các file. Mỗi fact nên có **một nguồn duy nhất** (single source of truth), các file khác link tới.
- Phát hiện thuật ngữ bất nhất giữa các file → ghi nhận, đề xuất sửa.

---

## E. Workflow trên repo này

- Mỗi session làm việc: đọc `progress.md` trước → biết đang ở đâu, làm gì tiếp.
- Hoàn thành 1 mục trong `progress.md` → update trạng thái + ghi rõ deliverable.
- Khi mở session mới, Claude tự kiểm tra `progress.md` và đề xuất task tiếp theo.
- Không bắt đầu task mới khi task cũ chưa close (trừ khi user yêu cầu).

---

## F. Đặc thù dự án — context tối thiểu

- Sản phẩm: **CC Portal** — cổng nội bộ công ty chế biến xuất khẩu tôm đông lạnh.
- Quy mô: 20-100 user, 1 server Windows nội bộ, LAN không Internet.
- Stack dự kiến: Node.js + Express + SQLite + EJS + HTML/JS thuần.
- Triết lý: launcher cho mini-app Vibe Coding — Portal đơn giản, mini-app HTML thuần.
- Giai đoạn hiện tại: **thiết kế, chưa code**. V1 = login + user/role + admin UI.

Chi tiết: `00-README.md`.
