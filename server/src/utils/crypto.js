import crypto from 'crypto';
import { config } from '../config/index.js';

/**
 * Derives a cryptographically secure 6-digit pickup code using HMAC-SHA256.
 * The code is deterministically derivable by the server using the server secret,
 * but only its SHA-256 hash is persisted in the database.
 */
export function derivePickupCode(donationId, verificationCreatedAt) {
  const secret = config.jwtSecret;
  const hmac = crypto.createHmac('sha256', secret);
  const timeStr = new Date(verificationCreatedAt).toISOString();
  hmac.update(`${donationId}:${timeStr}`);
  const digest = hmac.digest('hex');

  // Generate a friendly 6-digit numeric code from the digest
  const codeNum = (parseInt(digest.slice(0, 8), 16) % 900000) + 100000;
  return codeNum.toString();
}

/**
 * Computes a SHA-256 hash of the pickup code for database storage.
 */
export function hashPickupCode(code) {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

/**
 * Constant-time comparison between submitted code and stored SHA-256 hash.
 */
export function verifyPickupCode(submittedCode, storedHash) {
  if (!submittedCode || !storedHash) return false;
  const computedHash = hashPickupCode(submittedCode);

  if (computedHash.length !== storedHash.length) {
    return false;
  }

  const bufA = Buffer.from(computedHash, 'utf8');
  const bufB = Buffer.from(storedHash, 'utf8');

  return crypto.timingSafeEqual(bufA, bufB);
}
