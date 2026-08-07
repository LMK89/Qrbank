import test from 'node:test';
import assert from 'node:assert';
import { crc16 } from '../src/crc.js';

test('CRC-16/CCITT-FALSE vector', () => {
  assert.strictEqual(crc16('123456789'), '29B1');
});
