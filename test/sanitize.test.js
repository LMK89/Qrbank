import test from 'node:test';
import assert from 'node:assert';
import { sanitizePurpose, sanitizeAccountName } from '../src/sanitize.js';

test('sanitizePurpose - removes accents and handles Đ/đ', () => {
  assert.strictEqual(sanitizePurpose('Ăn trưa thứ 7 — bàn #3'), 'AN TRUA THU 7 BAN 3');
  assert.strictEqual(sanitizePurpose('Đại Cồ Việt'), 'DAI CO VIET');
});

test('sanitizePurpose - limits to 25 chars', () => {
  const longStr = 'Day la mot cai noi dung rat la dai hon hai lam ky tu';
  assert.strictEqual(sanitizePurpose(longStr), 'DAY LA MOT CAI NOI DUNG R');
});

test('sanitizePurpose - handles emojis and special chars', () => {
  assert.strictEqual(sanitizePurpose('Hello 🌍! @#$ %^&*'), 'HELLO');
  assert.strictEqual(sanitizePurpose('A   B\n\tC'), 'A B C');
});

test('sanitizePurpose - empty or null', () => {
  assert.strictEqual(sanitizePurpose(''), '');
  assert.strictEqual(sanitizePurpose(null), '');
  assert.strictEqual(sanitizePurpose(undefined), '');
});

test('sanitizeAccountName - removes accents and handles Đ/đ', () => {
  assert.strictEqual(sanitizeAccountName('Nguyễn Văn A'), 'NGUYEN VAN A');
  assert.strictEqual(sanitizeAccountName('Đặng Thị B'), 'DANG THI B');
});

test('sanitizeAccountName - keeps punctuation used in company names', () => {
  assert.strictEqual(
    sanitizeAccountName('Công ty TNHH MTV Thép Việt & Phát triển - Chi nhánh 2'),
    'CONG TY TNHH MTV THEP VIET & PHAT TRIEN - CHI NHANH 2'
  );
  assert.strictEqual(sanitizeAccountName("O'Brien Ltd."), "O'BRIEN LTD.");
});

test('sanitizeAccountName - does not cap at 25 chars (company names are long)', () => {
  const longCompany = 'Công ty TNHH Thương mại và Dịch vụ Xuất nhập khẩu Ánh Dương Việt Nam';
  const result = sanitizeAccountName(longCompany);
  assert.ok(result.length > 25, `expected > 25 chars, got ${result.length}`);
  assert.ok(result.startsWith('CONG TY TNHH THUONG MAI VA DICH VU XUAT NHAP KHAU'));
});

test('sanitizeAccountName - hard cap + empty input', () => {
  assert.strictEqual(sanitizeAccountName('A'.repeat(80)), 'A'.repeat(60));
  assert.strictEqual(sanitizeAccountName(''), '');
  assert.strictEqual(sanitizeAccountName(null), '');
  assert.strictEqual(sanitizeAccountName(undefined), '');
});
