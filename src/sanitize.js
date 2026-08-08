/**
 * Strips Vietnamese accents and normalizes the string to uppercase ASCII:
 * 1. Normalize to NFD to separate characters and their accents.
 * 2. Remove accent characters.
 * 3. Handle 'đ' and 'Đ'.
 * 4. Convert to uppercase.
 *
 * @param {string} str Input string
 * @returns {string} Accent-free uppercase string
 */
function stripAccents(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase();
}

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

  let sanitized = stripAccents(str)
    // Keep only A-Z, 0-9, replace everything else with space
    .replace(/[^A-Z0-9]/g, ' ')
    // Replace multiple spaces with a single space
    .replace(/\s+/g, ' ')
    // Trim leading/trailing spaces
    .trim();

  // Cut to max 25 characters
  return sanitized.substring(0, 25).trim(); // re-trim in case it cut at a space
}

/**
 * Sanitizes an account holder name (person or company) for display on a card.
 * Unlike `sanitizePurpose`, this does NOT cap at 25 chars: company names
 * (e.g. "CONG TY TNHH THUONG MAI VA DICH VU ABC") are routinely much longer,
 * and the card templates scale the font down to fit. It keeps a few safe
 * punctuation marks common in company/legal names (`.`, `&`, `-`, `'`, `/`)
 * instead of blanking them.
 *
 * @param {string} str Input string
 * @param {number} [maxLen=60] Hard safety cap; card text auto-shrinks so this
 *   only guards against pathological input.
 * @returns {string} Sanitized name
 */
export function sanitizeAccountName(str, maxLen = 60) {
  if (!str) return '';

  let sanitized = stripAccents(str)
    // Keep A-Z, 0-9 and a few safe punctuation marks, replace the rest with space
    .replace(/[^A-Z0-9.&\-'/]/g, ' ')
    // Replace multiple spaces with a single space
    .replace(/\s+/g, ' ')
    .trim();

  if (sanitized.length > maxLen) {
    sanitized = sanitized.substring(0, maxLen).trim();
  }
  return sanitized;
}
