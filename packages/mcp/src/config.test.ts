import { describe, it, expect } from 'vitest';
import { loadRuntimeConfigFromEnv } from './config.js';

describe('loadRuntimeConfigFromEnv', () => {
  it('requires COMMERCEBACKEND_API_URL', () => {
    expect(() => loadRuntimeConfigFromEnv({ COMMERCEBACKEND_API_KEY: 'k' })).toThrow(
      /COMMERCEBACKEND_API_URL/
    );
  });

  it('requires COMMERCEBACKEND_API_KEY', () => {
    expect(() => loadRuntimeConfigFromEnv({ COMMERCEBACKEND_API_URL: 'http://localhost:4000' })).toThrow(
      /COMMERCEBACKEND_API_KEY/
    );
  });

  it('applies defaults and strips a trailing slash from the API URL', () => {
    const config = loadRuntimeConfigFromEnv({
      COMMERCEBACKEND_API_URL: 'http://localhost:4000/',
      COMMERCEBACKEND_API_KEY: 'sk_test',
    });

    expect(config).toEqual({
      apiUrl: 'http://localhost:4000',
      apiKey: 'sk_test',
      defaultCurrency: 'usd',
      dryRun: false,
    });
  });

  it('reads COMMERCEBACKEND_DEFAULT_CURRENCY and COMMERCEBACKEND_DRY_RUN', () => {
    const config = loadRuntimeConfigFromEnv({
      COMMERCEBACKEND_API_URL: 'http://localhost:4000',
      COMMERCEBACKEND_API_KEY: 'sk_test',
      COMMERCEBACKEND_DEFAULT_CURRENCY: 'EUR',
      COMMERCEBACKEND_DRY_RUN: 'true',
    });

    expect(config.defaultCurrency).toBe('eur');
    expect(config.dryRun).toBe(true);
  });
});
