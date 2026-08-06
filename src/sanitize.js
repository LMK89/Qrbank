/**
 * Sanitizes a string for payment purpose (max 25 chars).
 * 1. Remove Vietnamese accents.
 * 2. Convert to uppercase.
 * 3. Keep only A-Z, 0-9, and spaces. Replace others with spaces.
 * 4. Merge multiple spaces into one, trim.
 * 5. Cut to max 25 characters.
 *
 * @param {string} str Input string
 * @returns {string} Sanitized string
 */
export function sanitizePurpose(str) {
  if (!str) return '';

  let sanitized = str
    // Normalize to NFD to separate characters and their accents
    .normalize('NFD')
    // Remove accent characters
    .replace(/[\u0300-\u036f]/g, '')
    // Handle 'đ' and 'Đ'
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    // Convert to uppercase
    .toUpperCase()
    // Keep only A-Z, 0-9, replace everything else with space
    .replace(/[^A-Z0-9]/g, ' ')
    // Replace multiple spaces with a single space
    .replace(/\s+/g, ' ')
    // Trim leading/trailing spaces
    .trim();

  // Cut to max 25 characters
  return sanitized.substring(0, 25).trim(); // re-trim in case it cut at a space
}
