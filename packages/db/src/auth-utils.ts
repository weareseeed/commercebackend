import * as crypto from 'crypto';

export function generateApiKey(prefix: string = 'cb_test_'): {
  apiKey: string;
  apiKeyHash: string;
} {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const apiKey = `${prefix}${randomBytes}`;
  const apiKeyHash = hashApiKey(apiKey);
  return { apiKey, apiKeyHash };
}

export function hashApiKey(apiKey: string): string {
  // API keys are high-entropy bearer tokens, but use a memory-hard KDF so
  // stored hashes are still expensive to brute force if the database leaks.
  return crypto.scryptSync(apiKey, 'commercebackend-api-key-v1', 32).toString('hex');
}

export function timingSafeCompare(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
