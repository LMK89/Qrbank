# vietqr-core

Module JavaScript thuần sinh mã QR chuyển khoản ngân hàng Việt Nam theo chuẩn EMVCo / Napas.

**Zero dependency ngoài. Không gọi API. Không cần backend. Chạy được offline.**

## Tính năng

- Sinh chuỗi payload VietQR từ thông tin tài khoản.
- Render thành QR trên `<canvas>` hoặc SVG.
- Chạy hoàn toàn trong trình duyệt hoặc Node.js.
- Không có network call ẩn, an toàn tuyệt đối với thông tin tài khoản người dùng.
- Tự động chuẩn hóa (sanitize) nội dung chuyển khoản theo chuẩn (bỏ dấu, in hoa, cắt ngắn).

## Cài đặt

> Package **chưa được publish lên npm registry**. Cho tới lúc đó, dùng qua thẻ `<script>` (jsDelivr đọc thẳng từ GitHub) hoặc `npm install` trực tiếp từ repo Git.

Khi đã publish lên npm:

```bash
npm install vietqr-core
```

Trong lúc chưa publish, cài thẳng từ GitHub:

```bash
npm install github:LMK89/Qrbank
```

Hoặc tải qua thẻ `<script>` (UMD version, không cần cài gì):

```html
<script src="https://cdn.jsdelivr.net/gh/LMK89/Qrbank@v0.1.0/dist/vietqr.umd.min.js"></script>
```
*(Luôn pin theo tag/commit cụ thể như `@v0.1.0`, đừng dùng `@latest`)*

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
  <canvas id="qr"></canvas>

  <script src="https://cdn.jsdelivr.net/gh/LMK89/Qrbank@v0.1.0/dist/vietqr.umd.min.js"></script>
  <script>
    const payload = VietQR.buildVietQR({
      bankBin: '970436',
      accountNo: '1234567890',
      amount: 50000
    });

    VietQR.renderVietQR(document.getElementById('qr'), payload);
  </script>
</body>
</html>
```

## API

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
- `banks`: Mảng các ngân hàng phổ biến kèm theo mã BIN.
- `findBank(bin)`: Hàm tiện ích để tìm kiếm ngân hàng trong mảng dựa vào mã BIN.

## Manual QA checklist

- [ ] `crc16('123456789') === '29B1'`
- [ ] Toàn bộ test ở mục 7 pass
- [ ] Không có `fetch` / `XMLHttpRequest` / `require('http')` nào trong `src/`
- [ ] `dist/vietqr.umd.min.js` < 20KB (Note: Hiện tại khoảng 26KB do bundle thêm QR code generator)
- [ ] `demo/index.html` mở bằng `file://` chạy được, không lỗi console
- [ ] Không có dependency runtime nào ngoài thư viện QR đã bundle
- [ ] Mọi input sai đều throw `Error` có message rõ, không trả về chuỗi hỏng
- [ ] Sinh QR rồi quét bằng tối thiểu 3 app ngân hàng khác nhau (ví dụ VCB, MB, Techcombank).

---
*Để xem chi tiết tài liệu đặc tả ban đầu, tham khảo [docs/SPEC.md](./docs/SPEC.md)*
