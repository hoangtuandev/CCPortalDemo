# 03. Hướng dẫn tích hợp mini-app với CC Portal

Tài liệu này dành cho **người Vibe Code mini-app**. Đây là tài liệu **bắt buộc đọc** trước khi viết bất kỳ mini-app nào — kể cả bằng AI.

> **Khi nhờ AI viết mini-app, hãy dán toàn bộ tài liệu này (hoặc đính kèm file) cho AI đọc trước.** AI cần biết các quy ước này để viết app tích hợp được với Portal — và quan trọng hơn, để không gây ra lỗ hổng bảo mật mà bạn không nhận ra.

> **Phiên bản tài liệu:** rev 2 — bổ sung các quy tắc bảo mật, khai báo schema, và xử lý ghi đồng thời. Đọc kỹ các section mới (8, 9, 11).

---

## 1. Mini-app là gì

Mini-app trong CC Portal là một **trang web HTML đơn lẻ** (single-page) thực hiện một nghiệp vụ cụ thể.

**Đặc điểm bắt buộc của mọi mini-app:**
- Viết bằng HTML + CSS + JavaScript thuần (không build step, không framework lớn)
- Tất cả nằm trong 1 folder, có file `index.html` ở gốc
- Không có backend riêng — dùng Storage API của Portal nếu cần lưu dữ liệu
- Có "Portal bar" ở đầu trang (xem mục 6)
- Có gọi `CCPortal.init()` để tích hợp với Portal (xem mục 5)
- Có khai báo schema nếu app có lưu dữ liệu (xem mục 8)
- Tên folder = slug app, chỉ chứa chữ thường, số, dấu gạch ngang

## 2. Cấu trúc folder mini-app

```
ten-app/                  # tên folder = slug app
├── index.html            # BẮT BUỘC — trang chính
├── assets/               # tùy chọn — chứa ảnh, font...
│   └── logo.png
└── lib/                  # tùy chọn — chứa thư viện thêm
    └── chart.min.js
```

**Quy tắc đặt tên folder/file:**
- Slug app (tên folder gốc): chỉ chữ thường, số, dấu gạch ngang. Ví dụ: `nhap-lieu-tom`, `bao-cao-qc`, `xem-luong`
- Tên file bên trong: không dấu, không khoảng trắng
- Không tạo file/folder bắt đầu bằng `.` (ẩn)

## 3. Vòng đời và môi trường chạy

### 3.1. URL của mini-app

Khi đăng ký với Portal, mini-app sẽ được phục vụ tại:
- App stable: `http://server/apps/<slug>/`
- App beta: `http://server/apps-beta/<slug>/`

**Quan trọng — không hardcode đường dẫn này trong code:**
- Khi app được promote từ beta sang stable, URL prefix thay đổi
- Mọi tham chiếu nội bộ phải dùng đường dẫn **tương đối** (`./asset.png`, `lib/chart.js`)
- Không bao giờ viết `<a href="/apps/...">` hay `fetch('/apps-beta/...')`
- Nếu cần tham chiếu sang app khác → dùng link tương đối từ root (`/`) trỏ về Portal, để user mở app kia từ dashboard

### 3.2. Điều kiện chạy

- Mini-app chỉ chạy được khi **user đã đăng nhập Portal**
- Khi user mở URL mini-app mà chưa đăng nhập → Portal tự redirect về trang login
- Khi user hết hạn session trong lúc đang dùng app → Portal trả về 401 cho các API call
- Mini-app phải xử lý trường hợp 401 (xem mục 5.3)

### 3.3. Content Security Policy (CSP)

Portal serve mini-app **kèm CSP header nghiêm ngặt**. Mini-app phải tuân thủ, nếu không sẽ bị browser block:

| CSP directive | Cho phép | Cấm |
|---|---|---|
| `default-src` | `'self'` | Mọi domain khác |
| `script-src` | `'self'`, inline handler (`onclick=`...), một số CDN trong whitelist | `eval()`, `new Function(...)`, `setTimeout('string', ...)`, tự nối `<script>` |
| `style-src` | `'self'`, `'unsafe-inline'` (cho phép inline CSS), CDN style trong whitelist | — |
| `connect-src` | `'self'` | Mọi domain ngoài (kể cả qua fetch) |
| `img-src` | `'self'`, `data:` | Domain ngoài |
| `frame-src` | `'none'` | Mọi iframe |

**Whitelist CDN hiện tại** (Portal duy trì):
- `cdn.jsdelivr.net/npm/@tabler/icons-webfont` (icon)
- `cdn.jsdelivr.net/npm/chart.js` (biểu đồ — khi cần)
- `cdn.jsdelivr.net/npm/papaparse` (parse CSV — khi cần)

Cần thêm CDN khác → đề xuất qua admin Portal, không tự ý dùng.

### 3.4. Tài nguyên Portal cung cấp

Mọi mini-app có thể truy cập các URL sau (đã có sẵn, không cần copy code):

| URL | Vai trò |
|---|---|
| `/portal-client.js` | Thư viện tích hợp Portal — bắt buộc include |
| `/api/me` | Lấy thông tin user đang đăng nhập |
| `/api/heartbeat` | Gửi tín hiệu "đang online" |
| `/api/apps/<slug>/storage/*` | Đọc/ghi dữ liệu của mini-app |
| `/api/apps/<slug>/log` | Ghi log nghiệp vụ tùy ý |

*(Mini-app không gọi trực tiếp các URL này — dùng API của `CCPortal` ở mục 5).*

## 4. Một mini-app trông như thế nào — cấu trúc tổng quát

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tên app</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.5.0/dist/tabler-icons.min.css">
  <style>/* ... */</style>
</head>
<body>
  <!-- KHAI BÁO SCHEMA (nếu app lưu data) — xem mục 8 -->
  <script type="application/json" id="cc-schema">{ ... }</script>

  <!-- Portal bar — xem mục 6 -->
  <div class="portal-bar">...</div>

  <!-- Nội dung app -->
  <main>...</main>

  <!-- Tích hợp Portal — xem mục 5 -->
  <script src="/portal-client.js"></script>
  <script>
    CCPortal.init({ appSlug: 'ten-app', onUserLoaded: ... });
    // ... logic nghiệp vụ
  </script>
</body>
</html>
```

## 5. Tích hợp với Portal qua portal-client.js

### 5.1. Khởi tạo

Thêm 2 dòng sau vào cuối thẻ `<body>` của `index.html`:

```html
<script src="/portal-client.js"></script>
<script>
  CCPortal.init({
    appSlug: 'ten-app-cua-ban',
    onUserLoaded: function(user) {
      // user = { id, username, full_name, role }
      console.log('User:', user);
      // Cập nhật UI với thông tin user
      document.getElementById('user-name').textContent = user.full_name;
    }
  });
</script>
```

**Lưu ý quan trọng:**
- `appSlug` phải khớp chính xác với tên folder của mini-app
- `onUserLoaded` được gọi sau khi lấy được thông tin user — đặt logic update UI vào đây
- Portal client **tự động** gửi heartbeat 30 giây/lần
- Portal client **tự động** xử lý session hết hạn (redirect về login)

### 5.2. Các thuộc tính/hàm của CCPortal

| Thuộc tính/hàm | Mô tả |
|---|---|
| `CCPortal.user` | Object thông tin user, có sau khi `init` xong |
| `CCPortal.init(options)` | Khởi tạo, gọi 1 lần khi load trang |
| `CCPortal.storage.get(key)` | Lấy 1 giá trị từ storage. Trả về Promise |
| `CCPortal.storage.set(key, value)` | Lưu 1 giá trị. Trả về Promise |
| `CCPortal.storage.delete(key)` | Xóa 1 key. Trả về Promise |
| `CCPortal.storage.list(prefix?)` | Lấy danh sách key, có thể lọc theo prefix |
| `CCPortal.log(action, details)` | Ghi log nghiệp vụ |
| `CCPortal.stop()` | Dừng heartbeat (ít khi cần) |

### 5.3. Xử lý lỗi và session hết hạn

`portal-client.js` đã xử lý sẵn việc redirect khi 401. Nhưng nếu mini-app tự gọi fetch trực tiếp, phải xử lý:

```javascript
async function callApi(url, options) {
  const res = await fetch(url, { ...options, credentials: 'same-origin' });
  if (res.status === 401) {
    alert('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
    window.location.href = '/login';
    return;
  }
  if (!res.ok) throw new Error('API lỗi: ' + res.status);
  return res.json();
}
```

### 5.4. Các mã lỗi mini-app cần xử lý

Storage API có thể trả các mã lỗi sau — mini-app phải xử lý đầy đủ:

| Mã | Tên | Khi nào | Cách xử lý |
|---|---|---|---|
| 400 | Bad Request | Schema validation fail, key sai format | Hiển thị lỗi cụ thể từ response, cho user sửa |
| 401 | Unauthorized | Session hết hạn | Redirect về `/login` |
| 403 | Forbidden | User mất quyền dùng app (admin vừa thu hồi) | Báo user và redirect về `/` |
| 409 | Conflict | `_v` không khớp — có người khác vừa sửa | Báo user, gọi lại `get` để lấy bản mới |
| 413 | Payload Too Large | Value vượt 1MB | Hiển thị lỗi, không retry |
| 429 | Too Many Requests | Rate limit | Đợi vài giây rồi retry |
| 500 | Server Error | Lỗi nội bộ Portal | Hiển thị lỗi chung, báo admin |

## 6. Portal Bar — Thanh điều hướng bắt buộc

Mọi mini-app phải có thanh ngang ở đầu trang gồm:
- Tên user đang đăng nhập (lấy từ `onUserLoaded`)
- Link "Về CC Portal" → trỏ về `/`

**HTML mẫu:**
```html
<div class="portal-bar">
  <div class="portal-bar-user">
    <span>Đang đăng nhập:</span>
    <strong id="user-name">...</strong>
  </div>
  <a href="/" class="portal-bar-link">← Về CC Portal</a>
</div>
```

**Lý do bắt buộc:**
- Giúp user nhận biết đang ở trong hệ thống Portal
- Cho phép quay về Portal nhanh
- Tạo cảm giác nhất quán giữa các app
- Là quy ước bảo mật: user phải luôn thấy mình đang ở đâu, không bị "lừa" bởi app giả mạo Portal

**Tuyệt đối không:**
- Ẩn Portal bar bằng CSS (`display:none`, `visibility:hidden`, `opacity:0`)
- Đè Portal bar bằng element khác
- Sửa class `.portal-bar` để Portal bar không nhận diện được

## 7. Storage API — Lưu trữ dữ liệu

### 7.1. Khái niệm cơ bản

- Mỗi mini-app có **namespace riêng** trên Portal, định danh bằng `appSlug`
- Dữ liệu trong namespace của app A **không thể truy cập** từ app B (Portal enforce ở server)
- Dữ liệu lưu dạng **key-value**: key là chuỗi, value là JSON tùy ý (nhưng phải khớp schema nếu có khai báo — xem mục 8)
- Mỗi giá trị tối đa **1MB**
- Mỗi app tối đa **10,000 key**

### 7.2. Quy ước đặt key

Key đặt theo dạng `<loai-du-lieu>:<id>`:
- `lo-tom:001`, `lo-tom:002` — các lô tôm
- `qc-report:2026-05-14:001` — báo cáo QC theo ngày
- `config:default` — cấu hình mặc định

Lý do: để dễ liệt kê và lọc theo prefix; cũng để khớp với khai báo schema (prefix = tên schema).

**Ràng buộc kỹ thuật của key (Portal sẽ reject nếu sai):**
- Chỉ chứa: chữ cái thường (`a-z`), số (`0-9`), dấu gạch ngang (`-`), dấu hai chấm (`:`), dấu chấm (`.`)
- Tối đa 200 ký tự
- Không bắt đầu hoặc kết thúc bằng dấu cách (Portal sẽ trim)
- **Không chứa `..` (hai dấu chấm liền nhau)** — chống path traversal
- Không chứa `/`, `\`, `?`, `#`, `%`, dấu cách, ký tự Unicode

Regex chính xác: `^[a-z0-9][a-z0-9\-:.]{0,199}$` AND không chứa `..`.

### 7.3. Lưu dữ liệu mới (CREATE)

```javascript
const id = 'lo-tom:' + Date.now();
const record = {
  // KHÔNG set _v khi tạo mới — Portal tự gán _v = 1
  _created_by: CCPortal.user.username,
  _created_at: new Date().toISOString(),
  _updated_by: CCPortal.user.username,
  _updated_at: new Date().toISOString(),
  // Field nghiệp vụ
  ma_lo: 'TOM-20260514-001',
  trong_luong_kg: 250,
  loai_tom: 'sú',
  ncc: 'Công ty A',
  ngay_nhap: '2026-05-14'
};

try {
  await CCPortal.storage.set(id, record);
} catch (err) {
  alert('Không lưu được: ' + err.message);
}
```

### 7.4. Cập nhật dữ liệu (UPDATE) — bắt buộc dùng optimistic concurrency

**Vấn đề:** 2 user cùng mở 1 record, cả 2 sửa, người sau ghi đè người trước → mất dữ liệu.

**Giải pháp:** mọi update phải gửi kèm `_v` của bản đang sửa. Portal kiểm tra `_v` trùng → tăng `_v` lên 1 và ghi. Khác → trả 409 Conflict, không ghi.

```javascript
async function updateLoTom(id, newValues) {
  // Bước 1: đọc bản hiện tại
  const current = await CCPortal.storage.get(id);
  if (!current) {
    alert('Record không tồn tại');
    return;
  }

  // Bước 2: merge thay đổi, GIỮ NGUYÊN _v (Portal sẽ kiểm tra)
  const updated = {
    ...current,
    ...newValues,
    _updated_by: CCPortal.user.username,
    _updated_at: new Date().toISOString()
    // _v: KHÔNG ĐỘNG VÀO — Portal tự tăng
  };

  // Bước 3: ghi với try-catch riêng cho conflict
  try {
    await CCPortal.storage.set(id, updated);
  } catch (err) {
    if (err.code === 'VERSION_CONFLICT') {
      alert(
        'Có người khác vừa sửa record này.\n' +
        'Vui lòng tải lại để xem thay đổi của họ, rồi nhập lại.'
      );
      // Quan trọng: KHÔNG retry tự động — để user quyết định
      return;
    }
    alert('Lỗi lưu: ' + err.message);
  }
}
```

**Không bao giờ:**
- Bỏ qua lỗi 409 và retry tự động — có thể ghi đè dữ liệu người khác
- Tự gán `_v` (kể cả `_v = current._v + 1`) — Portal tự quản lý
- Update mà không đọc bản hiện tại trước

### 7.5. Đọc dữ liệu

```javascript
const lo = await CCPortal.storage.get('lo-tom:001');
if (lo) {
  console.log('Mã lô:', lo.ma_lo, '(version:', lo._v, ')');
} else {
  console.log('Không tìm thấy');
}
```

### 7.6. Liệt kê

```javascript
// Tất cả key trong namespace
const allKeys = await CCPortal.storage.list();

// Chỉ key có prefix (hiệu quả hơn nếu nhiều data)
const loToms = await CCPortal.storage.list('lo-tom:');
```

### 7.7. Xóa

```javascript
if (!confirm('Bạn có chắc muốn xóa?')) return;
try {
  await CCPortal.storage.delete('lo-tom:001');
} catch (err) {
  alert('Lỗi xóa: ' + err.message);
}
```

## 8. Khai báo schema dữ liệu

### 8.1. Tại sao bắt buộc

Trước đây schema là "khuyến nghị". Bây giờ là **bắt buộc** cho mọi app có lưu data. Lý do:

- **Portal validate trước khi lưu** → tránh data lộn xộn do nhiều bản code khác nhau ghi cùng namespace
- **Tự động enforce kiểu dữ liệu** → bớt phải kiểm tra ở client
- **Chuẩn bị cho V3 DB chung** → schema có sẵn để map sang bảng
- **Hỗ trợ tool báo cáo sau này** → biết app này có những loại record gì

### 8.2. Cách khai báo

Đặt ngay sau `<body>`, **trước** mọi tag khác:

```html
<script type="application/json" id="cc-schema">
{
  "app_slug": "nhap-lieu-tom",
  "schema_version": 1,
  "schemas": {
    "lo-tom": {
      "description": "Một lô tôm nhập kho",
      "fields": {
        "ma_lo": { "type": "string", "required": true, "max_length": 50 },
        "trong_luong_kg": { "type": "number", "required": true, "min": 0, "max": 100000 },
        "loai_tom": { "type": "enum", "values": ["sú", "thẻ", "càng xanh"], "required": true },
        "ncc": { "type": "string", "required": true, "max_length": 200 },
        "ngay_nhap": { "type": "string", "required": true, "format": "date" },
        "nhiet_do_c": { "type": "number", "min": -5, "max": 30 },
        "ghi_chu": { "type": "string", "max_length": 1000 }
      }
    },
    "config": {
      "description": "Cấu hình app",
      "fields": {
        "default_ncc": { "type": "string", "max_length": 200 },
        "alert_temp_max": { "type": "number" }
      }
    }
  }
}
</script>
```

### 8.3. Quy tắc khớp schema → key

Khi gọi `CCPortal.storage.set('lo-tom:001', value)`:
1. Portal lấy prefix trước dấu `:` đầu tiên → `lo-tom`
2. Tìm schema cùng tên trong khai báo
3. Validate value
4. Nếu sai → trả 400 với thông tin cụ thể field nào sai
5. Nếu đúng → lưu

**Key không khớp schema nào:**
- Portal cho phép lưu (để linh hoạt) nhưng ghi warning log
- Tránh dùng kiểu này cho data nghiệp vụ — chỉ dùng cho data tạm/cache

### 8.4. Các kiểu dữ liệu hỗ trợ

| Type | Options | Ghi chú |
|---|---|---|
| `string` | `required`, `max_length`, `min_length`, `pattern` (regex) | |
| `number` | `required`, `min`, `max`, `integer` (boolean) | |
| `boolean` | `required` | |
| `enum` | `values` (array), `required` | |
| `date` | `required` | Định dạng `YYYY-MM-DD` |
| `datetime` | `required` | Định dạng ISO 8601 |
| `array` | `required`, `items` (schema con), `max_length` | |
| `object` | `required`, `fields` (schema con) | |

### 8.5. Đổi schema sau khi đã có data

Khi cần thêm field mới hoặc đổi rule:
1. Tăng `schema_version` lên (vd 1 → 2)
2. Field mới phải **không required** hoặc có `default`, để data cũ vẫn pass
3. Không xóa field cũ — chỉ đánh dấu `deprecated: true` để Portal warn
4. Khi tạo record mới, set `_schema_v: 2` trong record

Trong V3 sẽ có migration tool — nhưng V1+ ta giữ schema backward-compatible.

## 9. Ghi log nghiệp vụ

Ngoài log tự động của Portal (login, mở app...), mini-app có thể ghi log nghiệp vụ tùy ý:

```javascript
CCPortal.log('print_report', {
  report_id: 'QC-2026-05-14',
  printer: 'Office_HP'
});
```

### 9.1. Khi nào nên log

- Hành động quan trọng có hệ quả: in báo cáo, gửi email, duyệt đơn, xác nhận giao hàng
- Sự kiện cần audit: xóa record, sửa số lượng lớn, thay đổi trạng thái
- Sự kiện phục vụ truy xuất nguồn gốc: tạo lô, chuyển công đoạn, đóng gói

### 9.2. KHÔNG bao giờ log

**Cấm tuyệt đối trong trường `details`:**
- Password, OTP, token, API key, secret bất kỳ dạng nào
- Số tài khoản ngân hàng, số thẻ tín dụng, số CMND/CCCD, số hộ chiếu
- Toàn bộ payload của record (chỉ log ID)
- Dữ liệu cá nhân nhạy cảm (lương, đánh giá nhân sự, kỷ luật...)

**Tránh:**
- Log mọi thao tác nhỏ (gõ phím, di chuột, scroll, click thông thường)
- Log mỗi lần đọc data (đã có log đọc tự động ở Portal)
- Payload lớn — Portal sẽ truncate `details` ở **1KB**

### 9.3. Format khuyến nghị

```javascript
CCPortal.log('action_name', {
  // ID của object liên quan, không phải toàn bộ object
  record_id: 'lo-tom:001',
  // Field nào đã đổi — không phải giá trị
  changed_fields: ['trong_luong_kg', 'nhiet_do_c'],
  // Metadata bổ sung ngắn gọn
  reason: 'điều chỉnh sau cân lại'
});
```

## 10. Vai trò (role) — chỉ để hiện/ẩn UI

`CCPortal.user.role` có thể dùng để ẩn/hiện chức năng trong UI:

```javascript
if (CCPortal.user.role === 'Quản lý') {
  document.getElementById('btn-approve').style.display = 'block';
}
```

**Cảnh báo quan trọng:**
- Đây CHỈ là để UI gọn, **KHÔNG phải để cấp quyền thực sự**
- User kỹ thuật mở DevTools có thể tự hiện lại nút và bấm
- Mọi hành động có hệ quả phải được Portal kiểm tra quyền ở server
- Cụ thể: Portal chặn user không có quyền dùng app ở mức truy cập URL, nhưng mini-app **phải tự giả định** rằng mọi API call có thể đến từ user có quyền tối thiểu — nghiệp vụ "nâng quyền" trong app (vd "chỉ Quản lý mới duyệt") phải được implement ở app trung gian hoặc chuyển sang V3 (có per-action permission)

Trong V1+, **không có app nào nên có chức năng nội bộ phân chia theo role** — nếu cần phân quyền hành động, tách thành 2 app khác nhau với 2 set quyền khác nhau.

## 11. Bảo mật — những ràng buộc kỹ thuật

### 11.1. CSP — đã nói ở mục 3.3

Tóm tắt lại để dễ nhớ:
- Không `eval()`, `new Function()`, `setTimeout('string', ...)`
- Không tự nối `<script>` rồi inject vào DOM
- Không load script/style từ domain ngoài (trừ whitelist)
- Inline `onclick="..."` thì OK (CSP cho phép)
- Inline `<style>` thì OK

### 11.2. XSS — escape mọi nội dung user nhập

**Quy tắc vàng:** mọi chuỗi không phải hằng số trong code, khi đưa vào HTML, đều phải escape.

```javascript
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Khi đưa vào innerHTML — escape
container.innerHTML = `<td>${escapeHtml(record.ma_lo)}</td>`;

// An toàn hơn — dùng textContent
cell.textContent = record.ma_lo;
```

**Nguy hiểm nhất** (hay quên): render dữ liệu do **user khác** tạo. Ví dụ trong app báo cáo, hiển thị tên người tạo record — chuỗi này đến từ user khác, có thể chứa HTML/JS độc hại.

**Tuyệt đối không:**
- `element.innerHTML = userInput` (chưa escape)
- `eval(userInput)`, `new Function(userInput)`
- `document.write(userInput)`
- `element.setAttribute('onclick', userInput)`

### 11.3. Không hardcode URL nội bộ

- Cấm: `'/apps/'`, `'/apps-beta/'` trong code
- Cấm: gọi API của app khác (`fetch('/api/apps/xem-luong/...')`)
- Asset của chính app: dùng đường dẫn tương đối (`./logo.png`, `lib/chart.js`)
- Trở về Portal: link trỏ tới `/` (gốc)

### 11.4. Không thao tác với cookie hoặc session

- Không đọc `document.cookie`
- Không gọi `/login`, `/logout` thủ công (Portal client tự xử lý)
- Không tự refresh session
- Không cố đăng nhập với danh nghĩa user khác

### 11.5. Không lưu credential trong code

Code mini-app là **public** trong nội bộ — bất kỳ user nào dùng app cũng có thể xem source qua DevTools.
- Không hardcode password, API key, secret
- Không có "magic string" để mở chức năng ẩn
- Nếu cần config bí mật → Portal sẽ có Secrets API ở V3

### 11.6. Validate input phía client + tin server

Client-side validation là để **UX** (báo lỗi nhanh, không round-trip), không phải để bảo mật:
- Validate format, range, required ở client → user thấy lỗi ngay
- Server (Portal) cũng validate lại theo schema → đảm bảo data sạch dù client bị bypass

**Ví dụ đầy đủ:**

```javascript
async function onSave() {
  const trongLuong = Number(document.getElementById('trong-luong').value);

  // Client-side validate — cho UX tốt
  if (isNaN(trongLuong) || trongLuong <= 0) {
    alert('Trọng lượng phải là số dương');
    return;
  }

  // Server-side cũng kiểm tra qua schema
  try {
    await CCPortal.storage.set('lo-tom:' + Date.now(), {
      trong_luong_kg: trongLuong,
      // ...
    });
  } catch (err) {
    // Nếu validate ở client thiếu, server vẫn bắt
    if (err.code === 'SCHEMA_VALIDATION_FAILED') {
      alert('Dữ liệu không hợp lệ: ' + err.message);
      return;
    }
    alert('Lỗi: ' + err.message);
  }
}
```

## 12. Quy ước giao diện

Để các mini-app trông nhất quán, **khuyến nghị** (không bắt buộc) theo các quy ước sau:

### 12.1. Bảng màu

```css
:root {
  --primary: #0d6efd;
  --primary-dark: #0a58ca;
  --bg: #f5f7fa;
  --surface: #ffffff;
  --border: #e1e5eb;
  --text: #1a1f2e;
  --text-muted: #6c757d;
  --success: #198754;
  --warning: #f59e0b;
  --danger: #dc3545;
}
```

### 12.2. Font

- Font chính: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- Size mặc định: 14px
- Tiêu đề: 16-22px

### 12.3. Icon

- Dùng Tabler Icons qua CDN trong whitelist
- Sử dụng: `<i class="ti ti-clipboard-list"></i>`

### 12.4. Bố cục

- Container max-width: 900-1200px
- Căn giữa: `margin: 0 auto`
- Padding ngoài: 24px

### 12.5. Component cơ bản

- Card: nền trắng, border 1px màu border, border-radius 8px, padding 24px
- Button primary: nền màu primary, chữ trắng, padding 10x20px, border-radius 6px
- Input: border 1px, padding 10px, border-radius 6px

## 13. Quy trình đưa mini-app lên Portal

**Bước 1: Phát triển local**
- Vibe Code ra `index.html`
- Test bằng cách mở file trực tiếp trong trình duyệt (chấp nhận `CCPortal.init` lỗi vì không có Portal)

**Bước 2: Copy vào server**
- Remote vào server Portal
- Tạo folder `apps-beta/<slug>/` (luôn bắt đầu ở beta)
- Copy file vào

**Bước 3: Đăng ký với Portal**
- Đăng nhập Portal bằng tài khoản admin
- Vào `/admin/apps` → Đăng ký app mới
- Portal **tự đọc** schema từ `<script id="cc-schema">` và validate cấu trúc
- Nếu schema sai → Portal báo lỗi cụ thể, không cho đăng ký

**Bước 4: Cấp quyền**
- Trong ma trận phân quyền, tick các role được dùng app
- Bắt đầu chỉ tick role nhỏ (vd Admin) để test

**Bước 5: Test**
- Đăng xuất, đăng nhập bằng tài khoản test
- Vào dashboard, click app
- Test: tạo mới, sửa (test 2 tab cùng sửa để verify conflict handling), xóa

**Bước 6: Promote sang stable**
- Sau khi test ổn (vài ngày hoặc vài tuần), admin chuyển app từ beta sang stable
- Khi đó: folder move từ `apps-beta/` → `apps/`, URL prefix đổi
- Nhờ không hardcode URL prefix nên app không cần sửa code
- Mở rộng quyền cho các role khác

## 14. Checklist trước khi đăng ký app

**Cấu trúc:**
- [ ] Folder app đặt tên đúng quy ước slug
- [ ] Có file `index.html` ở gốc folder
- [ ] Không có file/folder ẩn (`.git`, `.DS_Store`...)
- [ ] Không có `node_modules/`, `dist/`, hoặc thư mục build

**Tích hợp Portal:**
- [ ] Có include `/portal-client.js`
- [ ] Có gọi `CCPortal.init({ appSlug: '...' })`
- [ ] `appSlug` khớp với tên folder
- [ ] Có Portal bar ở đầu trang, không bị ẩn/đè
- [ ] Có hiển thị tên user (`user.full_name`)
- [ ] Có link về Portal (`href="/"`)

**Schema:**
- [ ] Có `<script type="application/json" id="cc-schema">` (nếu app lưu data)
- [ ] `app_slug` trong schema khớp với folder và `appSlug`
- [ ] Mọi loại record app có dùng đều có schema tương ứng
- [ ] Field bắt buộc đã đánh dấu `required`

**Lưu trữ:**
- [ ] Dùng Storage API, không dùng localStorage cho data nghiệp vụ
- [ ] Mọi record có meta: `_created_by`, `_created_at`, `_updated_by`, `_updated_at`
- [ ] Key đặt theo quy ước `<loại>:<id>`, không chứa `..`
- [ ] Update có xử lý 409 Conflict (optimistic concurrency)
- [ ] Mọi storage call có try-catch và xử lý mã lỗi cụ thể (xem mục 5.4)

**Bảo mật:**
- [ ] Không `eval`, `new Function`, `setTimeout('string', ...)`
- [ ] Mọi chuỗi từ user/storage được escape khi vào `innerHTML`
- [ ] Không hardcode `/apps/`, `/apps-beta/`
- [ ] Không log password, OTP, dữ liệu nhạy cảm
- [ ] Không đọc/sửa cookie

**UX:**
- [ ] Có loading state khi tải data
- [ ] Có empty state khi không có data
- [ ] Form có validate client-side
- [ ] Xóa có confirm
- [ ] Lỗi 409 hiện thông báo dễ hiểu, không tự retry
- [ ] Lỗi 401 redirect về login
- [ ] Hiển thị tốt trên màn hình 1366×768 trở lên

**Testing:**
- [ ] Test với 2 user khác nhau
- [ ] Test khi không có data (empty state)
- [ ] Test khi có nhiều data (vài chục record)
- [ ] **Test 2 tab cùng sửa 1 record** (verify conflict)
- [ ] Test khi session hết hạn giữa chừng
- [ ] Test khi nhập sai schema (verify server reject)

## 15. Những điều KHÔNG được làm

**Tuyệt đối không (Portal hoặc browser sẽ chặn):**
- Dùng `eval()`, `new Function()`, `setTimeout('string', ...)`
- Load script từ domain ngoài (ngoài whitelist)
- Truy cập storage của app khác
- Đọc/sửa `document.cookie`
- Ẩn/đè/sửa Portal bar
- Hardcode `/apps/` hoặc `/apps-beta/` trong URL
- Tự gán `_v` khi update record
- Retry tự động khi gặp 409 Conflict

**Tuyệt đối không (về mặt nguyên tắc):**
- Lưu password, OTP, token vào storage
- Log password, dữ liệu cá nhân nhạy cảm
- Hardcode credential trong code
- Phụ thuộc vào role check ở client để cấp quyền hành động
- Mở popup/alert spam làm phiền user
- Tự build form login bên trong mini-app

**Tránh nếu không cần thiết:**
- Auto-refresh trang quá thường xuyên
- Load thư viện lớn (>500KB) khi chỉ dùng vài chức năng nhỏ
- Lưu blob lớn (>500KB) vào storage — dùng file API (V2)
- Tạo record không khớp schema nào (Portal log warning)

## 16. Câu hỏi thường gặp

**Q: Tôi muốn lưu file (ảnh, PDF), Storage API có hỗ trợ không?**

A: V1+ chỉ hỗ trợ JSON. File ảnh/PDF nên lưu vào folder mạng chung, mini-app lưu đường dẫn vào storage. V2 sẽ có upload API riêng.

**Q: Mini-app có chạy được offline không?**

A: Không. Cần kết nối tới Portal liên tục (cho session, schema validate, storage).

**Q: Tôi muốn dùng React/Vue cho mini-app, được không?**

A: Được, miễn là:
- Build sẵn thành file HTML + JS tĩnh, không cần dev server
- Tuân thủ CSP (no `eval`, no dynamic script)
- Vue/React build production thường OK; tránh dev build vì có `eval`

Nhưng khuyến nghị HTML thuần vì đơn giản hơn cho Vibe Coding và dễ debug.

**Q: 2 mini-app có thể chia sẻ dữ liệu không?**

A: Trực tiếp thì không (mỗi app có namespace riêng). Cách workaround:
- App A export ra file Excel/JSON, user import vào app B
- Hoặc viết app trung gian có quyền vào cả 2 storage (V2)
- Hoặc đợi V3 có DB chung với query liên app

**Q: Storage giới hạn bao nhiêu dữ liệu?**

A: Mỗi app tối đa 10,000 key, mỗi value tối đa 1MB. Trong thực tế nên giữ tổng dưới 50MB để hiệu năng tốt.

**Q: Có thể có nhiều file HTML trong 1 mini-app không?**

A: Có. `index.html` là entry point, có thể link sang file khác cùng folder. Mọi file đều bị CSP áp dụng.

**Q: Làm sao biết user đang dùng quyền gì?**

A: Đối tượng `CCPortal.user` có trường `role`. Nhưng nhớ: chỉ dùng để hiện/ẩn UI, không phải để cấp quyền (xem mục 10).

**Q: Tôi update record nhưng bị 409 hoài, làm sao?**

A: 409 = có người khác vừa sửa record cùng lúc. Bạn phải:
1. Gọi lại `CCPortal.storage.get(key)` để lấy bản mới
2. Hiển thị cho user xem thay đổi của người khác
3. Để user quyết định: merge thủ công hoặc bỏ
4. Không bao giờ tự retry — sẽ ghi đè dữ liệu người khác

**Q: Schema của tôi cần thay đổi, làm gì?**

A: Xem mục 8.5. Quy tắc: tăng `schema_version`, field mới phải có default hoặc không required, không xóa field cũ.

**Q: Có cách nào test app trước khi đẩy lên server không?**

A: Mở file `index.html` trực tiếp trong trình duyệt — UI hiện được nhưng `CCPortal.init` báo lỗi. Để test đầy đủ phải đẩy lên server Portal trong môi trường test/beta.

## 17. Liên hệ và hỗ trợ

- Tài liệu kiến trúc tổng thể: [02-architecture.md](./02-architecture.md)
- Template mini-app mẫu: [templates/mini-app-template/](./templates/mini-app-template/)
- Hướng dẫn AI ngắn gọn: [templates/mini-app-template/notes-for-ai.md](./templates/mini-app-template/notes-for-ai.md)
- Prompt chuẩn cho AI: [templates/PROMPT-vibe-coding.md](./templates/PROMPT-vibe-coding.md)
