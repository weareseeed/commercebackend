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

  it('strips multiple trailing slashes without a catastrophic-backtracking regex', () => {
    const config = loadRuntimeConfigFromEnv({
      COMMERCEBACKEND_API_URL: 'http://localhost:4000////',
      COMMERCEBACKEND_API_KEY: 'sk_test',
    });

    expect(config.apiUrl).toBe('http://localhost:4000');
  });

  it('handles a pathological run of trailing slashes in linear time', () => {
    const pathological = `http://localhost:4000${'/'.repeat(200_000)}x`;
    const start = performance.now();
    const config = loadRuntimeConfigFromEnv({
      COMMERCEBACKEND_API_URL: pathological,
      COMMERCEBACKEND_API_KEY: 'sk_test',
    });
    const elapsedMs = performance.now() - start;

    // A trailing character after the slash run means nothing gets stripped;
    // the point of this test is that it returns near-instantly rather than
    // hanging on backtracking.
    expect(config.apiUrl).toBe(pathological);
    expect(elapsedMs).toBeLessThan(200);
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
