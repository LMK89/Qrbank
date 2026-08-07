import test from 'node:test';
import assert from 'node:assert';
import { sanitizePurpose } from '../src/sanitize.js';

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
