import { formatTLV } from './tlv.js';
import { crc16 } from './crc.js';
import { sanitizePurpose } from './sanitize.js';

/**
 * Builds a VietQR payload string.
 * @param {Object} options
 * @param {string} options.bankBin 6-digit BIN
 * @param {string} options.accountNo Account number
 * @param {number} [options.amount] Amount in VND (integer > 0)
 * @param {string} [options.purpose] Transfer purpose
 * @param {string} [options.service='QRIBFTTA'] Service code ('QRIBFTTA' or 'QRIBFTTC')
 * @returns {string} VietQR payload
 */
export function buildVietQR({ bankBin, accountNo, amount, purpose, service = 'QRIBFTTA' }) {
  if (!bankBin || !/^\d{6}$/.test(bankBin)) {
    throw new Error('Invalid bankBin: must be 6 digits');
  }

  if (!accountNo || typeof accountNo !== 'string' || accountNo.length > 19 || !/^[A-Za-z0-9]+$/.test(accountNo)) {
    throw new Error('Invalid accountNo: must be alphanumeric and max 19 characters');
  }

  let amountStr = '';
  let qrType = '11'; // Static
  if (amount !== undefined && amount !== null && amount !== 0) {
    if (!Number.isInteger(amount) || amount < 0 || amount.toString().length > 13) {
      throw new Error('Invalid amount: must be a positive integer and max 13 digits');
    }
    amountStr = amount.toString();
    qrType = '12'; // Dynamic
  }

  // Build field 38 (Merchant Account Information)
  const consumerId = formatTLV('00', bankBin, 'BIN') + formatTLV('01', accountNo, 'AccountNo');
  const napasInfo = formatTLV('00', 'A000000727', 'AID') + formatTLV('01', consumerId, 'ConsumerInfo') + formatTLV('02', service, 'ServiceCode');
  const field38 = formatTLV('38', napasInfo, 'Field38');

  // Build field 62 (Additional Data Field)
  let field62 = '';
  if (purpose) {
    const sanitizedPurpose = sanitizePurpose(purpose);
    if (sanitizedPurpose) {
      const purposeTLV = formatTLV('08', sanitizedPurpose, 'Purpose');
      field62 = formatTLV('62', purposeTLV, 'Field62');
    }
  }

  // Combine parts
  const payload =
    formatTLV('00', '01') + // Payload Format Indicator
    formatTLV('01', qrType) + // Point of Initiation Method
    field38 +
    formatTLV('53', '704') + // Transaction Currency
    (amountStr ? formatTLV('54', amountStr, 'Amount') : '') + // Transaction Amount
    formatTLV('58', 'VN') + // Country Code
    field62 +
    '6304'; // CRC ID and length

  // Calculate CRC
  const crc = crc16(payload);

  return payload + crc;
}
