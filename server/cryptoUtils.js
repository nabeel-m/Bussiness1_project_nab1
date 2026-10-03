import crypto from 'crypto';

/**
 * Derives a salted cryptographic hash using memory-hard scrypt.
 * @param {string} password 
 * @returns {string} scrypt:<saltHex>:<hashHex>
 */
export function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Constant-time password verification supporting salted scrypt hashes
 * as well as graceful legacy plaintext fallback for automatic migration.
 * @param {string} password - Attempted password
 * @param {string} stored - Stored password string from database
 * @returns {boolean}
 */
export function verifyPassword(password, stored) {
  if (!password || !stored || typeof password !== 'string' || typeof stored !== 'string') {
    return false;
  }

  // Modern salted scrypt hash
  if (stored.startsWith('scrypt:')) {
    const parts = stored.split(':');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const originalHashHex = parts[2];

    try {
      const derivedKey = crypto.scryptSync(password, salt, 64);
      const originalKey = Buffer.from(originalHashHex, 'hex');
      if (derivedKey.length !== originalKey.length) return false;
      return crypto.timingSafeEqual(derivedKey, originalKey);
    } catch (e) {
      return false;
    }
  }

  // Fallback for legacy plaintext (prevents breakage before auto-migration)
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(stored);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return password === stored;
  }
}

/**
 * Checks whether a stored password requires migration to salted scrypt.
 * @param {string} stored 
 * @returns {boolean}
 */
export function needsRehash(stored) {
  return typeof stored !== 'string' || !stored.startsWith('scrypt:');
}
