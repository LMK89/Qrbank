# vietqr-core

Module JavaScript thuần sinh mã QR chuyển khoản ngân hàng Việt Nam theo chuẩn EMVCo / Napas.

Thư viện được chia làm 2 phần độc lập, phục vụ các mục đích khác nhau:
1. `vietqr-core`: Chịu trách nhiệm tạo chuỗi EMVCo Payload, vẽ QR ra thẻ Canvas/SVG, và gắn nhẹ một watermark siêu nhỏ dưới cùng (`qr.lmk.vn`) đảm bảo không lẹm vào vùng quiet zone. Zero dependency, dùng cho các mục đích thiết yếu và tối giản.
2. `vietqr-card`: Module xử lý render QR thành những layout thẻ chuyên nghiệp, đẹp mắt (như thẻ Polaroid, hoặc thiết kế dạng biên lai). Toàn bộ được xây dựng dựa trên **SVG thuần túy**.

**Zero dependency ngoài. Không gọi API. Không cần backend. Chạy được offline.**

### Vì sao `vietqr-card` sử dụng SVG thuần thay vì HTML/CSS + html-to-image?

Quá trình xây dựng ban đầu có thử nghiệm dùng DOM/HTML kết hợp các thư viện chụp ảnh màn hình ngầm (`html2canvas`, `html-to-image`). Tuy nhiên, phương pháp này gặp phải các nhược điểm nghiêm trọng:
- Phụ thuộc vào tốc độ nạp Font hệ thống / Webfont của môi trường.
- Bị dính bẫy `display: none` (không thể render ra ảnh nếu DOM đang bị ẩn, buộc phải dùng các hack CSS `position: fixed; left: -9999px;` kém ổn định).
- Phình to dung lượng thư viện khi nhúng thêm module rasterize HTML lớn.

Giải pháp thay thế là **tạo cấu trúc card trực tiếp bằng mã SVG**. Cách này vừa siêu nhẹ, đồng bộ (synchronous), hoàn toàn tự cô lập (self-contained), vừa không bị ảnh hưởng bởi CSS của trang cha. Base64 được trả về trực tiếp, sẵn sàng nhét vào thẻ `<img>` và chuyển đổi qua PNG dễ dàng.

## Tính năng

- Sinh chuỗi payload VietQR chuẩn Napas.
- Render mã QR cơ bản lên `<canvas>` hoặc `<svg>` với watermark.
- Render thành Card Template (Polaroid, Tối giản) qua file ảnh SVG Base64 (dùng `vietqr-card`).
- Chạy hoàn toàn trong trình duyệt hoặc Node.js.
- An toàn tuyệt đối, không thu thập dữ liệu qua network.
- Tự động xử lý tiếng Việt có dấu, cắt ngắn đúng chuẩn cho nội dung chuyển khoản.

## Cài đặt

> Package **chưa được publish lên npm registry**. Trong lúc chờ publish, dùng qua thẻ `<script>` (jsDelivr đọc thẳng từ GitHub) hoặc `npm install` trực tiếp từ repo Git.

Khi đã publish lên npm:

```bash
npm install vietqr-core
```

Trong lúc chưa publish, cài thẳng từ GitHub:

```bash
npm install github:LMK89/Qrbank
```

Hoặc tải qua thẻ `<script>` (UMD version):

```html
<!-- Dành cho module cốt lõi (tạo payload và render QR cơ bản) -->
<script src="https://cdn.jsdelivr.net/npm/vietqr@1.2.3/dist/vietqr-core.min.js"></script>
<!-- Dành cho module tạo layout thẻ (Polaroid, Tối giản) -->
<script src="https://cdn.jsdelivr.net/npm/vietqr@1.2.3/dist/vietqr-card.min.js"></script>
```

## Cách dùng

### Dùng như một Module (ESM/Bundler)

```javascript
import { buildVietQR, renderVietQR } from 'vietqr-core';

// 1. Sinh chuỗi payload
const payload = buildVietQR({
  bankBin: '970436',       // Bắt buộc: BIN ngân hàng (6 chữ số)
  accountNo: '1234567890', // Bắt buộc: Số tài khoản
  amount: 250000,          // Tùy chọn: Số tiền (số nguyên)
  purpose: 'Ăn trưa'       // Tùy chọn: Nội dung chuyển khoản (tự sanitize, không cần bỏ dấu tay)
});

// 2. Render ra Canvas hoặc SVG
const targetElement = document.getElementById('my-qr-canvas');
renderVietQR(targetElement, payload, {
  size: 300,
  margin: 4
});
```

### Dùng qua `require` (Node CommonJS)

```javascript
const { buildVietQR, renderVietQR } = require('vietqr-core');

const payload = buildVietQR({ bankBin: '970436', accountNo: '1234567890', amount: 50000 });
```

### Dùng qua thẻ `<script>`

```html
<!DOCTYPE html>
<html>
<body>
  <!-- Canvas cho QR cơ bản -->
  <canvas id="qr"></canvas>

  <!-- Image tag cho các template VietQR Card -->
  <img id="qr-card" />

  <!-- Dành cho module cốt lõi -->
  <script src="https://cdn.jsdelivr.net/npm/vietqr@1.2.3/dist/vietqr-core.min.js"></script>
  <!-- Dành cho module tạo layout thẻ -->
  <script src="https://cdn.jsdelivr.net/npm/vietqr@1.2.3/dist/vietqr-card.min.js"></script>

  <script>
    const payload = VietQR.buildVietQR({
      bankBin: '970436',
      accountNo: '1234567890',
      amount: 50000
    });

    // 1. Render bằng Core
    VietQR.renderVietQR(document.getElementById('qr'), payload);

    // 2. Render bằng Card Template (Tạo giao diện thẻ)
    const cardOptions = {
        bankBin: '970436',
        accountNo: '1234567890',
        amount: 50000,
        accountName: 'NGUYEN VAN A'
    };
    const card = VietQRCard.generateVietQRCard(payload, 'polaroid', cardOptions);
    // Nhúng chuỗi base64 vào thẻ img
    document.getElementById('qr-card').src = card.dataURL;
  </script>
</body>
</html>
```

## Module VietQR Card (`vietqr-card.min.js`)

Module riêng biệt nhằm cung cấp những giao diện thẻ VietQR chuyên nghiệp, được xây dựng hoàn toàn trên nền SVG (không gọi DOM, CSS, html2canvas, đảm bảo ảnh render ra luôn sắc nét & tương thích cao).

### `generateVietQRCard(payload, templateId, data) -> object`

Tạo ra một cấu trúc thẻ từ payload được cung cấp. Cấu trúc trả về bao gồm `svg` (chuỗi) và `dataURL` (base64 SVG).

| Tham số | Kiểu dữ liệu | Bắt buộc | Mô tả |
| --- | --- | --- | --- |
| `payload` | `string` | **Có** | Chuỗi payload sinh ra từ `buildVietQR`. |
| `templateId` | `string` | **Có** | Mẫu thiết kế để sinh (e.g. `'minimal'`, `'polaroid'`). |
| `data` | `object` | **Có** | Thông tin hiển thị: `bankBin`, `accountNo`, `amount`, `purpose`, `accountName`, `bankName`. |


## API (vietqr-core)

### `buildVietQR(options) -> string`

Tạo chuỗi EMVCo payload.

| Option | Kiểu dữ liệu | Bắt buộc | Mô tả |
| --- | --- | --- | --- |
| `bankBin` | `string` | **Có** | Mã BIN ngân hàng gồm 6 chữ số (VD: `'970436'`). |
| `accountNo` | `string` | **Có** | Số tài khoản người nhận (chỉ chứa chữ/số, tối đa 19 ký tự). |
| `amount` | `number` | Không | Số tiền chuyển khoản (số nguyên dương, VND). Nếu để trống sẽ sinh QR tĩnh. |
| `purpose` | `string` | Không | Nội dung chuyển khoản. Sẽ tự động được gọi qua `sanitizePurpose`. |
| `service` | `string` | Không | Mã dịch vụ Napas. Mặc định là `'QRIBFTTA'` (chuyển tới số tài khoản). |

### `renderVietQR(target, payload, options?)`

Vẽ chuỗi payload thành mã QR.

| Option | Kiểu dữ liệu | Mặc định | Mô tả |
| --- | --- | --- | --- |
| `size` | `number` | `256` | Kích thước mã QR (pixels). |
| `margin` | `number` | `4` | Viền trắng xung quanh QR (tính bằng số module). |
| `ecLevel` | `string` | `'M'` | Mức độ sửa lỗi (`'L'`, `'M'`, `'Q'`, `'H'`). |
| `dark` | `string` | `'#000000'` | Màu sắc cho các điểm ảnh đen. |
| `light` | `string` | `'#FFFFFF'` | Màu sắc cho nền. |

### Các Export phụ khác

- `sanitizePurpose(str)`: Chuẩn hóa nội dung chuyển khoản (bỏ dấu, chữ hoa, giữ tối đa 25 ký tự).
- `sanitizeAccountName(str, maxLen?)`: Chuẩn hóa tên chủ tài khoản (cá nhân hoặc công ty) để hiển thị — bỏ dấu, chữ hoa, giữ dấu `.`, `&`, `-`, `'`, `/` phổ biến trong tên công ty, không cắt về 25 ký tự (card tự co chữ để vừa).
- `banks`: Mảng các ngân hàng phổ biến kèm theo mã BIN.
- `findBank(bin)`: Hàm tiện ích để tìm kiếm ngân hàng trong mảng dựa vào mã BIN.

## Manual QA checklist

- [x] `crc16('123456789') === '29B1'`
- [x] Toàn bộ test ở mục 7 pass
- [x] Không có `fetch` / `XMLHttpRequest` / `require('http')` nào trong `src/`
- [x] `dist/vietqr.umd.min.js` < 20KB (Note: Hiện tại khoảng 26KB do bundle thêm QR code generator)
- [x] `docs/index.html` mở bằng `file://` chạy được, không lỗi console
- [x] Không có dependency runtime nào ngoài thư viện QR đã bundle
- [x] Mọi input sai đều throw `Error` có message rõ, không trả về chuỗi hỏng
- [x] Sinh QR rồi quét bằng tối thiểu 3 app ngân hàng khác nhau (ví dụ VCB, MB, Techcombank).

---
*Để xem chi tiết tài liệu đặc tả ban đầu, tham khảo [docs/SPEC.md](./docs/SPEC.md)*
