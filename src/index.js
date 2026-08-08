import { buildVietQR } from './build.js';
import { renderVietQR } from './render.js';
import { sanitizePurpose, sanitizeAccountName } from './sanitize.js';
import banksData from './banks.json' with { type: 'json' };

export { buildVietQR, renderVietQR, sanitizePurpose, sanitizeAccountName };

export const banks = banksData;

/**
 * Finds a bank by its BIN.
 * @param {string} bin 6-digit BIN
 * @returns {Object|undefined} The bank object if found
 */
export function findBank(bin) {
  return banks.find(b => b.bin === bin);
}
