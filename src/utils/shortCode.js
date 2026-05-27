const crypto = require('crypto');

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const DEFAULT_LENGTH = 7;

/**
 * Generate a random base62 short code.
 * @param {number} length - number of characters (default 7)
 * @returns {string}
 */
function generateShortCode(length = DEFAULT_LENGTH) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => BASE62[b % 62])
    .join('');
}

/**
 * Validate that a slug contains only URL-safe characters.
 * Allowed: letters, digits, hyphen, underscore.
 */
function isValidSlug(slug) {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(slug);
}

module.exports = { generateShortCode, isValidSlug };
