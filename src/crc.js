/**
 * CRC-16/CCITT-FALSE
 * - Polynomial: 0x1021
 * - Initial: 0xFFFF
 * - RefIn: false
 * - RefOut: false
 * - XorOut: 0x0000
 *
 * @param {string} str Input string
 * @returns {string} 4 uppercase hex characters
 */
export function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) > 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  // Ensure the result is 16-bit
  crc &= 0xFFFF;
  // Pad with 0 up to 4 hex characters
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
