import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('dist/vietqr.cjs is a working CommonJS entry point', () => {
  const VietQR = require('../dist/vietqr.cjs');
  assert.strictEqual(typeof VietQR.buildVietQR, 'function');
  assert.strictEqual(typeof VietQR.renderVietQR, 'function');
  assert.strictEqual(typeof VietQR.sanitizePurpose, 'function');
  assert.ok(Array.isArray(VietQR.banks));

  const payload = VietQR.buildVietQR({ bankBin: '970436', accountNo: '123' });
  assert.strictEqual(typeof payload, 'string');
});
