/**
 * Formats a single TLV field.
 * @param {string} id 2-digit field ID
 * @param {string} value The field value
 * @param {string} fieldName Descriptive name for error messages
 * @returns {string} The formatted TLV string
 * @throws {Error} If value length > 99
 */
export function formatTLV(id, value, fieldName = id) {
  if (value === undefined || value === null) {
    return '';
  }
  const strVal = String(value);
  if (strVal.length > 99) {
    throw new Error(`Length of field ${fieldName} exceeds 99 characters`);
  }
  const len = strVal.length.toString().padStart(2, '0');
  return `${id}${len}${strVal}`;
}
