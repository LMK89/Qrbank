import test from 'node:test';
import assert from 'node:assert';
import { buildVietQR } from '../src/build.js';
import { crc16 } from '../src/crc.js';

// Helper to parse TLV
function parseTLV(str) {
  const fields = {};
  let i = 0;
  while (i < str.length) {
    if (i + 4 > str.length) break;
    const id = str.substring(i, i + 2);
    const len = parseInt(str.substring(i + 2, i + 4), 10);
    const value = str.substring(i + 4, i + 4 + len);
    fields[id] = value;
    i += 4 + len;
  }
  return fields;
}

test('buildVietQR - basic static QR (no amount, no purpose)', () => {
  const payload = buildVietQR({ bankBin: '970407', accountNo: '123456' });
  const fields = parseTLV(payload);

  assert.strictEqual(fields['00'], '01');
  assert.strictEqual(fields['01'], '11');
  assert.strictEqual(fields['53'], '704');
  assert.strictEqual(fields['58'], 'VN');
  assert.strictEqual(fields['54'], undefined);
  assert.strictEqual(fields['62'], undefined);
  assert.strictEqual(fields['63'].length, 4);

  const f38 = parseTLV(fields['38']);
  assert.strictEqual(f38['00'], 'A000000727');
  assert.strictEqual(f38['02'], 'QRIBFTTA');

  const f38_01 = parseTLV(f38['01']);
  assert.strictEqual(f38_01['00'], '970407');
  assert.strictEqual(f38_01['01'], '123456');

  // Verify CRC
  const payloadWithoutCRC = payload.substring(0, payload.length - 4);
  const calculatedCRC = crc16(payloadWithoutCRC);
  assert.strictEqual(fields['63'], calculatedCRC);
});

test('buildVietQR - dynamic QR (with amount and purpose)', () => {
  const payload = buildVietQR({ bankBin: '970436', accountNo: '123', amount: 250000, purpose: 'AN TRUA' });
  const fields = parseTLV(payload);

  assert.strictEqual(fields['01'], '12'); // Dynamic
  assert.strictEqual(fields['54'], '250000');

  const f62 = parseTLV(fields['62']);
  assert.strictEqual(f62['08'], 'AN TRUA');

  // Verify CRC
  const payloadWithoutCRC = payload.substring(0, payload.length - 4);
  const calculatedCRC = crc16(payloadWithoutCRC);
  assert.strictEqual(fields['63'], calculatedCRC);
});

test('buildVietQR - invalid amount', () => {
  assert.throws(() => buildVietQR({ bankBin: '970436', accountNo: '123', amount: -500 }), /Invalid amount/);
  assert.throws(() => buildVietQR({ bankBin: '970436', accountNo: '123', amount: 1.5 }), /Invalid amount/);
  assert.throws(() => buildVietQR({ bankBin: '970436', accountNo: '123', amount: 12345678901234 }), /Invalid amount/);
});

test('buildVietQR - invalid bankBin', () => {
  assert.throws(() => buildVietQR({ bankBin: '12345', accountNo: '123' }), /Invalid bankBin/);
  assert.throws(() => buildVietQR({ bankBin: '12345A', accountNo: '123' }), /Invalid bankBin/);
});

test('buildVietQR - invalid accountNo', () => {
  assert.throws(() => buildVietQR({ bankBin: '970436', accountNo: '' }), /Invalid accountNo/);
  assert.throws(() => buildVietQR({ bankBin: '970436', accountNo: '12345678901234567890' }), /Invalid accountNo/); // length 20
  assert.throws(() => buildVietQR({ bankBin: '970436', accountNo: '123!@#' }), /Invalid accountNo/);
});

test('buildVietQR - purpose is auto-sanitized (accents, case, length)', () => {
  const payload = buildVietQR({ bankBin: '970436', accountNo: '123', purpose: 'Ăn trưa thứ 7' });
  const fields = parseTLV(payload);
  const f62 = parseTLV(fields['62']);
  assert.strictEqual(f62['08'], 'AN TRUA THU 7');
});

test('buildVietQR - purpose that sanitizes to empty string omits field 62', () => {
  const payload = buildVietQR({ bankBin: '970436', accountNo: '123', purpose: '🌍🎉' });
  const fields = parseTLV(payload);
  assert.strictEqual(fields['62'], undefined);
});
