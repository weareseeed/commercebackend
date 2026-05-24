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
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

export function timingSafeCompare(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
