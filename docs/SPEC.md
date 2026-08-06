# Qrbank
qr.lmk.vn

# vietqr-core

Module JavaScript thuần sinh mã QR chuyển khoản ngân hàng Việt Nam theo chuẩn EMVCo / Napas.

**Zero dependency ngoài. Không gọi API. Không cần backend. Chạy được offline.**

---

## 1. Mục tiêu & phạm vi

### Module này LÀM

- Sinh chuỗi payload VietQR (EMVCo Merchant-Presented QR) từ thông tin tài khoản.
- Render chuỗi đó thành QR trên `<canvas>` hoặc SVG.
- Chạy hoàn toàn trong trình duyệt (hoặc Node), không cần mạng.
- Dùng lại được cho nhiều dự án khác nhau qua npm hoặc thẻ `<script>`.

### Module này KHÔNG làm

| Không làm | Lý do |
|---|---|
| Đối soát / xác nhận đã nhận tiền | QR không mang thông tin ngược lại. Cần dịch vụ đọc biến động số dư — thuộc module khác. |
| Gọi `img.vietqr.io` hay dịch vụ sinh ảnh QR nào | Số tài khoản của người dùng sẽ đi qua server bên thứ ba. Không đánh đổi. |
| Lưu trữ dữ liệu, có state, có server | Đây là hàm thuần. |
| Xác thực số tài khoản có tồn tại thật không | Không có cách nào làm offline. |

### Nguyên tắc bất di bất dịch

> **Không có bất kỳ network call nào ở runtime.** Nếu implementation cần `fetch`, `axios`, hay bất kỳ HTTP request nào để sinh QR — là làm sai.

---

## 2. Kiến thức nền: payload VietQR là gì

Mã QR chuyển khoản **không phải** là kết nối tới ngân hàng. Nó chỉ là một **chuỗi text** được encode thành hình QR. App ngân hàng quét, parse chuỗi, rồi tự điền vào form chuyển khoản của nó.

Chuỗi này theo chuẩn EMVCo, định dạng **TLV** (Tag–Length–Value), có thể lồng nhau.

### Quy tắc TLV

```
[ID: 2 chữ số][LENGTH: 2 chữ số][VALUE: độ dài đúng bằng LENGTH]
```

Ví dụ: `0002` + `01` → field ID `00`, dài `02`, giá trị `01`.

Vì LENGTH chỉ có 2 chữ số nên **mỗi value tối đa 99 ký tự**. Vượt quá phải throw error, không được cắt âm thầm.

### Các field ở tầng gốc

| ID | Tên | Bắt buộc | Giá trị |
|---|---|---|---|
| `00` | Payload Format Indicator | Có | Luôn là `01` |
| `01` | Point of Initiation Method | Có | `11` = QR tĩnh (quét nhiều lần, không có số tiền)<br>`12` = QR động (có số tiền, dùng 1 lần) |
| `38` | Merchant Account Information | Có | TLV lồng — xem mục dưới |
| `53` | Transaction Currency | Có | `704` (mã ISO 4217 của VND) |
| `54` | Transaction Amount | Không | Số nguyên dạng chuỗi, ví dụ `250000`. **Bỏ hẳn field này nếu QR tĩnh.** |
| `58` | Country Code | Có | `VN` |
| `62` | Additional Data Field | Không | TLV lồng, chứa nội dung chuyển khoản |
| `63` | CRC | Có | 4 ký tự hex, **luôn nằm cuối cùng** |

### Field 38 — lồng ba tầng

```
38 (len)
├── 00 (10) A000000727          ← AID của Napas, hằng số
├── 01 (len)                     ← cụm lồng tiếp
│   ├── 00 (06) 970436           ← BIN ngân hàng, 6 chữ số
│   └── 01 (len) 1234567890      ← số tài khoản
└── 02 (08) QRIBFTTA             ← mã dịch vụ
```

Mã dịch vụ (field `02`):
- `QRIBFTTA` — chuyển tới **số tài khoản** (dùng cái này 99% trường hợp)
- `QRIBFTTC` — chuyển tới **số thẻ**

### Field 62 — nội dung chuyển khoản

```
62 (len)
└── 08 (len) NOI DUNG CHUYEN KHOAN
```

Sub-field `08` là Purpose of Transaction. Nếu không có nội dung thì **bỏ hẳn field 62**, đừng để rỗng.

### Field 63 — CRC (chỗ dễ sai nhất)

Thuật toán: **CRC-16/CCITT-FALSE**
- Polynomial: `0x1021`
- Init: `0xFFFF`
- Không reflect input, không reflect output, không XOR out
- Kết quả: 4 ký tự hex **viết hoa**, pad `0` bên trái nếu thiếu

**Bẫy chí mạng:** CRC được tính trên toàn bộ chuỗi **đã bao gồm cả `6304`** (tức ID `63` + length `04`), rồi mới nối 4 ký tự kết quả vào sau.

```
payload = "0002...5802VN" + "6304"
crc     = crc16(payload)
final   = payload + crc
```

Sai CRC thì app ngân hàng chỉ báo "mã QR không hợp lệ" — không nói gì thêm. Đây là lý do phải test thật kỹ.

---

## 3. Cấu trúc repo

```
vietqr-core/
├── src/
│   ├── index.js          # export public API
│   ├── tlv.js            # helper TLV + validate độ dài
│   ├── crc.js            # CRC-16/CCITT-FALSE
│   ├── build.js          # buildVietQR()
│   ├── render.js         # renderVietQR()
│   ├── sanitize.js       # xử lý nội dung chuyển khoản
│   └── banks.json        # danh sách BIN ngân hàng (tĩnh, commit vào repo)
├── test/
│   ├── crc.test.js
│   ├── build.test.js
│   └── sanitize.test.js
├── demo/
│   └── index.html        # trang demo 1 file, dùng bản UMD
├── dist/                 # build ra, có commit để jsDelivr load được
│   ├── vietqr.umd.js
│   └── vietqr.umd.min.js
├── package.json
├── LICENSE               # MIT
└── README.md
```

---

## 4. Public API

Chỉ **hai hàm**. Đừng thêm gì nữa.

### `buildVietQR(options) → string`

```js
const payload = buildVietQR({
  bankBin:   '970436',        // bắt buộc, 6 chữ số
  accountNo: '1234567890',    // bắt buộc, chữ và số
  amount:    250000,          // tuỳ chọn, số nguyên VND
  purpose:   'AN TRUA T7',    // tuỳ chọn
  service:   'QRIBFTTA'       // tuỳ chọn, mặc định QRIBFTTA
});
// → "00020101021238...63041A2B"
```

**Quy tắc xử lý:**

| Tình huống | Hành vi |
|---|---|
| Có `amount` (> 0) | Field `01` = `12`, có field `54` |
| Không có `amount` hoặc `amount = 0` | Field `01` = `11`, **bỏ hẳn** field `54` |
| `amount` không phải số nguyên | Throw. Không tự làm tròn. |
| `amount` âm hoặc quá 13 chữ số | Throw |
| `bankBin` không đúng 6 chữ số | Throw |
| `accountNo` rỗng, có ký tự lạ, hoặc > 19 ký tự | Throw |
| Không có `purpose` | Bỏ hẳn field `62` |
| Bất kỳ value nào dài > 99 | Throw, kèm tên field trong message |

Error phải là `Error` với message tiếng Anh rõ ràng, ví dụ `Invalid bankBin: must be 6 digits`.

### `renderVietQR(target, payload, options?) → void`

```js
renderVietQR(document.getElementById('qr'), payload, {
  size: 320,              // px, mặc định 256
  margin: 4,              // module, mặc định 4
  ecLevel: 'M',           // L/M/Q/H, mặc định 'M'
  dark: '#000000',
  light: '#FFFFFF'
});
```

- `target` là `<canvas>` hoặc `<div>` (nếu div thì render SVG vào trong).
- Dùng thư viện QR encode có sẵn (`qrcode` hoặc `qrcode-generator`, license MIT), **không tự viết** — encode QR có Reed-Solomon, làm lại không đáng.
- Thư viện này phải được bundle vào `dist/`, không load từ CDN ngoài.

### Export phụ (tiện, không bắt buộc)

```js
import { banks, findBank } from 'vietqr-core';

findBank('970436')  // → { bin: '970436', code: 'TCB', name: 'Techcombank', short: 'Techcombank' }
banks               // → mảng đầy đủ, để đổ vào <select>
```

---

## 5. Xử lý nội dung chuyển khoản (`sanitize.js`)

Đây là chỗ hay vỡ trận nhất khi chạy thật.

**Quy tắc:**

1. Bỏ dấu tiếng Việt: `Ăn trưa thứ 7` → `An trua thu 7`. Dùng `normalize('NFD')` + strip range `\u0300-\u036f`, xử lý riêng `đ`/`Đ` → `d`/`D`.
2. Viết hoa toàn bộ.
3. Chỉ giữ `A-Z`, `0-9`, khoảng trắng. Ký tự khác → thay bằng khoảng trắng.
4. Gộp nhiều khoảng trắng thành một, trim hai đầu.
5. Cắt còn tối đa **25 ký tự**.

Lý do giới hạn 25: nhiều ngân hàng tự cắt hoặc từ chối nội dung dài. 25 là mức an toàn thực tế, dù chuẩn cho phép dài hơn.

```js
sanitizePurpose('Ăn trưa thứ 7 — bàn #3')  // → 'AN TRUA THU 7 BAN 3'
```

Hàm này phải export ra để dự án ngoài gọi được trước khi hiển thị preview cho người dùng.

---

## 6. `banks.json`

File tĩnh, commit vào repo. **Không fetch lúc runtime, cũng không fetch lúc build.**

Format:

```json
[
  { "bin": "970436", "code": "VCB", "name": "Ngân hàng TMCP Ngoại thương Việt Nam", "short": "Vietcombank" },
  { "bin": "970407", "code": "TCB", "name": "Ngân hàng TMCP Kỹ thương Việt Nam", "short": "Techcombank" }
]
```

**Cách tạo file này:** tôi (người dùng) sẽ tự cung cấp, hoặc Claude Code lấy một lần từ nguồn công khai rồi commit. Sau đó nó là dữ liệu tĩnh của repo — nguồn gốc chết cũng không ảnh hưởng.

Chỉ cần khoảng 20 ngân hàng phổ biến là đủ dùng: VCB, TCB, MB, ACB, VPB, BIDV, VietinBank, TPBank, Sacombank, VIB, SHB, HDBank, MSB, OCB, SeABank, Eximbank, Nam A Bank, BVBank, Agribank, Cake/Timo.

Nếu thiếu bank nào, người dùng vẫn nhập BIN tay được — module không được chặn BIN lạ, chỉ cần đúng 6 chữ số.

---

## 7. Test — yêu cầu bắt buộc

### 7.1 CRC (test vector chuẩn, phải pass)

```js
crc16('123456789') === '29B1'
```

Đây là check value chính thức của CRC-16/CCITT-FALSE. Nếu ra khác là thuật toán sai — sửa xong mới đi tiếp.

### 7.2 Cấu trúc payload

Test bằng cách **parse ngược** chuỗi vừa sinh, không hardcode chuỗi kỳ vọng:

- Parse lại `buildVietQR(...)` thành cây TLV → kiểm tra từng field đúng vị trí, đúng độ dài.
- Tổng độ dài mỗi TLV khớp với LENGTH khai báo.
- Chuỗi luôn kết thúc bằng `63` + `04` + 4 hex.
- CRC tính lại từ phần đầu khớp với 4 ký tự cuối.
- Có `amount` → field `01` phải là `12` và tồn tại field `54`.
- Không `amount` → field `01` phải là `11` và **không** tồn tại field `54`.
- Không `purpose` → không tồn tại field `62`.

Viết luôn hàm `parseTLV(str)` trong test để làm việc này (không cần export ra public API).

### 7.3 Sanitize

Ít nhất các case: có dấu, có `đ`, có emoji, có ký tự đặc biệt, chuỗi dài > 25, chuỗi toàn khoảng trắng.

### 7.4 Test thật (người dùng làm, không tự động được)

Sinh QR rồi **quét bằng tối thiểu 3 app ngân hàng khác nhau** (ví dụ VCB, MB, Techcombank). Mức độ chặt của mỗi app khác nhau — pass 1 app không có nghĩa là đúng.

Checklist khi quét: app điền đúng ngân hàng, đúng số tài khoản, đúng số tiền, đúng nội dung.

> Claude Code: hãy để lại mục **"Manual QA checklist"** trong README của repo, đừng đánh dấu task hoàn thành khi chưa có bước này.

---

## 8. Đóng gói & phân phối

Quyết định: **repo riêng, publish npm, đồng thời commit bản UMD để load qua jsDelivr.** Không dựng API, không fork copy-paste sang từng dự án.

- Fork về từng codebase → sửa 1 chỗ phải đồng bộ tay nhiều nơi, kiểu gì cũng lệch phiên bản.
- Dựng API → thêm điểm chết, thêm tiền server, và số tài khoản người dùng nằm trong log của mình. Không đáng.

### package.json

```json
{
  "name": "vietqr-core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/vietqr.umd.js",
  "module": "./src/index.js",
  "exports": {
    ".": { "import": "./src/index.js", "require": "./dist/vietqr.umd.js" }
  },
  "files": ["src", "dist", "LICENSE", "README.md"],
  "license": "MIT",
  "sideEffects": false
}
```

### Ba cách dùng phải chạy được

**ES module (bundler / dự án hiện đại):**
```js
import { buildVietQR, renderVietQR } from 'vietqr-core';
```

**Thẻ script (trang tĩnh trên GitHub Pages — quan trọng nhất):**
```html
<script src="https://cdn.jsdelivr.net/gh/<user>/vietqr-core@v0.1.0/dist/vietqr.umd.min.js"></script>
<script>
  const p = VietQR.buildVietQR({ bankBin: '970436', accountNo: '123', amount: 50000 });
  VietQR.renderVietQR(document.getElementById('qr'), p);
</script>
```
Global name: `VietQR`. **Luôn pin version bằng tag** trong URL jsDelivr, đừng để `@latest`.

**Node (để test):** `require('vietqr-core')`

### Build

Dùng `esbuild` (nhanh, config ngắn) sinh `dist/vietqr.umd.js` + bản `.min.js`. Bundle luôn thư viện QR vào trong. Mục tiêu: bản min **dưới 20KB**.

Thêm GitHub Action: chạy test + build khi push tag, commit `dist/` vào tag.

---

## 9. Trang demo (`demo/index.html`)

Một file HTML duy nhất, không framework, dùng bản UMD từ `dist/`. Đây vừa là demo sống vừa là tool tôi tự xài để in QR cho từng bàn.

**Form 4 ô:**
1. Ngân hàng — `<select>` đổ từ `banks.json`, có cho phép nhập BIN tay
2. Số tài khoản
3. Số tiền (để trống = QR tĩnh)
4. Nội dung — hiện preview đã sanitize ngay bên dưới, để người dùng thấy trước cái gì thật sự đi vào QR

**Output:**
- QR render live, đổi input là đổi ngay (debounce ~200ms)
- Nút **Tải ảnh PNG**
- Nút **Copy link** — nén toàn bộ tham số vào `location.hash` (base64 của JSON), mở link ra là tự điền lại form
- Hiện chuỗi payload thô trong khối `<code>` có nút copy, để debug

**Yêu cầu:** trang phải chạy được khi mở bằng `file://`, không cần server.

**Cảnh báo cho người dùng:** đặt một dòng nhỏ dưới form — dữ liệu chỉ nằm trong trình duyệt, không gửi đi đâu; nhưng link share có chứa số tài khoản trong hash nên đừng đăng công khai.

---

## 10. Dự án sẽ dùng lại module này

Ghi để Claude Code hiểu vì sao API phải gọn và không có state:

| Dự án | Dùng để |
|---|---|
| Split bill | QR riêng cho từng người, nội dung = tên + mã bill |
| Thiệp cưới online | Khách chuyển tiền mừng nếu không dự được |
| Trang photo/portfolio | Nút donate |
| Quán/shop | QR riêng từng bàn, từng hoá đơn — phân biệt bằng nội dung chuyển khoản |

Nội dung chuyển khoản chính là khoá để sau này nhìn sao kê biết ai trả. Vì vậy **sanitize phải ổn định** — cùng input phải luôn ra cùng output, không random, không phụ thuộc locale.

---

## 11. Definition of Done

- [ ] `crc16('123456789') === '29B1'`
- [ ] Toàn bộ test ở mục 7 pass
- [ ] Không có `fetch` / `XMLHttpRequest` / `require('http')` nào trong `src/`
- [ ] `dist/vietqr.umd.min.js` < 20KB
- [ ] `demo/index.html` mở bằng `file://` chạy được, không lỗi console
- [ ] README của repo có mục "Manual QA checklist" chưa tick
- [ ] Không có dependency runtime nào ngoài thư viện QR đã bundle
- [ ] Mọi input sai đều throw `Error` có message rõ, không trả về chuỗi hỏng

---

## 12. Ghi chú cho Claude Code

- Ưu tiên **đọc kỹ mục 2** trước khi code. Sai TLV hoặc sai CRC thì mọi thứ khác vô nghĩa.
- Viết `crc.js` và test của nó **trước tiên**, verify bằng test vector, rồi mới làm phần còn lại.
- Không thêm feature ngoài spec (không thêm logo giữa QR, không thêm template ảnh, không thêm i18n). Giữ module nhỏ.
- Code comment bằng tiếng Anh, README repo bằng tiếng Việt.
- Nếu có chỗ nào trong spec này mâu thuẫn hoặc thiếu, **hỏi lại trước khi tự quyết**, đặc biệt là phần liên quan tới chuẩn Napas.
