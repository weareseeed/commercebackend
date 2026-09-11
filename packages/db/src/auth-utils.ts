import * as crypto from 'crypto';

// Legacy shared salt. Kept only so API keys issued before the per-record
// salt migration keep authenticating; never used for newly generated keys.
const LEGACY_SALT = 'commercebackend-api-key-v1';

const KEY_ID_HEX_LENGTH = 16; // 8 random bytes, hex-encoded
const SECRET_BYTES = 24;
const SALT_BYTES = 16;

export interface GeneratedApiKey {
  apiKey: string;
  apiKeyHash: string;
  apiKeySalt: string;
  apiKeyId: string;
}

/**
 * Generates a new-format API key: `<prefix><keyId>.<secret>`.
 *
 * `keyId` is a public, indexed lookup token (not secret on its own); the
 * secret is never stored, only `apiKeyHash`, a hash of the *full* key salted
 * with a random per-record `apiKeySalt`. Verification looks the row up by
 * `keyId` first, then recomputes the salted hash and compares it. A shared
 * salt would let one leaked (hash, salt) pair be reused to brute-force every
 * other key's hash with the same rainbow table; a per-record salt confines
 * that cost to a single key.
 */
export function generateApiKey(prefix: string = 'cb_test_'): GeneratedApiKey {
  const keyId = crypto.randomBytes(KEY_ID_HEX_LENGTH / 2).toString('hex');
  const secret = crypto.randomBytes(SECRET_BYTES).toString('hex');
  const apiKey = `${prefix}${keyId}.${secret}`;
  const apiKeySalt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const apiKeyHash = hashApiKeyWithSalt(apiKey, apiKeySalt);
  return { apiKey, apiKeyHash, apiKeySalt, apiKeyId: keyId };
}

/** Hashes a full API key with an explicit (typically per-record) salt. */
export function hashApiKeyWithSalt(apiKey: string, salt: string): string {
  return crypto.scryptSync(apiKey, salt, 32).toString('hex');
}

/**
 * Legacy hash path: a memory-hard KDF over a shared static salt. API keys
 * are high-entropy bearer tokens so this was never brute-forceable, but it
 * is superseded by `generateApiKey` + `hashApiKeyWithSalt` for new keys.
 * Kept unchanged so agents created before the per-record-salt migration
 * keep authenticating without a backfill.
 */
export function hashApiKey(apiKey: string): string {
  return crypto.scryptSync(apiKey, LEGACY_SALT, 32).toString('hex');
}

/**
 * Extracts the public `keyId` from a new-format key
 * (`<prefix><keyId>.<secret>`), or `null` if `apiKey` is an old-format key
 * (no embedded id) that should instead be verified via `hashApiKey`.
 */
export function extractApiKeyId(apiKey: string): string | null {
  const dotIndex = apiKey.indexOf('.');
  if (dotIndex === -1) return null;
  const beforeDot = apiKey.slice(0, dotIndex);
  const keyId = beforeDot.slice(-KEY_ID_HEX_LENGTH);
  if (keyId.length !== KEY_ID_HEX_LENGTH || !/^[0-9a-f]+$/.test(keyId)) return null;
  return keyId;
}
