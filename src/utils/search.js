/**
 * Normalizes a string for diacritic and accent-insensitive matching.
 * Converts to lowercase, decomposes combined Unicode graphemes (NFD),
 * and removes combining diacritical marks (\u0300-\u036f).
 *
 * @param {string} str - Raw input string
 * @returns {string} Normalized ASCII-like lowercase string
 */
export function normalizeStr(str) {
  return (str ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Checks whether a target string contains a search query, ignoring
 * case differences, accents, and diacritics.
 *
 * @param {string} target - The text to search within
 * @param {string} query - The search query
 * @returns {boolean} True if query is empty or target contains normalized query
 */
export function fuzzyIncludes(target, query) {
  const normQuery = normalizeStr(query).trim();
  if (!normQuery) return true;
  return normalizeStr(target).includes(normQuery);
}
