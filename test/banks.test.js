import test from 'node:test';
import assert from 'node:assert';
import banks from '../src/banks.json' with { type: 'json' };

test('banks.json - has at least the major banks', () => {
  assert.ok(Array.isArray(banks), 'banks should be an array');
  assert.ok(banks.length > 10, `expected more than 10 banks, got ${banks.length}`);
});

test('banks.json - every bank has all required fields', () => {
  for (const bank of banks) {
    assert.ok(bank.bin, `missing bin for ${bank.code || 'unknown'}`);
    assert.ok(bank.code, `missing code for ${bank.bin}`);
    assert.ok(bank.name, `missing name for ${bank.bin}`);
    assert.ok(bank.short, `missing short for ${bank.bin}`);
  }
});

test('banks.json - every BIN is exactly 6 digits', () => {
  for (const bank of banks) {
    assert.match(bank.bin, /^\d{6}$/, `invalid BIN: ${bank.bin}`);
  }
});

test('banks.json - no duplicate BINs or codes', () => {
  const bins = banks.map(b => b.bin);
  const codes = banks.map(b => b.code);
  assert.strictEqual(new Set(bins).size, bins.length, 'duplicate BIN found');
  assert.strictEqual(new Set(codes).size, codes.length, 'duplicate code found');
});
