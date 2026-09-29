import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchLiveBigCommerceCatalog,
  isPlaceholderBigCommerceToken,
  isPlaceholderBigCommerceStoreHash,
  bigCommerceApiBaseUrl,
} from './live-client.js';

describe('isPlaceholderBigCommerceToken', () => {
  it('treats unset, empty, and placeholder-looking values as placeholders', () => {
    expect(isPlaceholderBigCommerceToken(undefined)).toBe(true);
    expect(isPlaceholderBigCommerceToken('')).toBe(true);
    expect(isPlaceholderBigCommerceToken('your_bigcommerce_access_token')).toBe(true);
    expect(isPlaceholderBigCommerceToken('mock_token')).toBe(true);
    expect(isPlaceholderBigCommerceToken('PLACEHOLDER')).toBe(true);
  });

  it('treats a real-looking token as not a placeholder', () => {
    expect(isPlaceholderBigCommerceToken('a1b2c3d4e5f6example_real_looking_token')).toBe(false);
  });
});

describe('isPlaceholderBigCommerceStoreHash', () => {
  it('treats unset, empty, and placeholder-looking values as placeholders', () => {
    expect(isPlaceholderBigCommerceStoreHash(undefined)).toBe(true);
    expect(isPlaceholderBigCommerceStoreHash('')).toBe(true);
    expect(isPlaceholderBigCommerceStoreHash('your_store_hash')).toBe(true);
  });

  it('treats a real-looking store hash as not a placeholder', () => {
    expect(isPlaceholderBigCommerceStoreHash('abc123def')).toBe(false);
  });
});

describe('bigCommerceApiBaseUrl', () => {
  it('builds the store-scoped v3 API base URL', () => {
    expect(bigCommerceApiBaseUrl('abc123def')).toBe('https://api.bigcommerce.com/stores/abc123def/v3');
  });
});

describe('fetchLiveBigCommerceCatalog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches a single page and sends the expected auth headers against the store-scoped host', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 1, name: 'Live Product' }],
        meta: { pagination: { current_page: 1, total_pages: 1 } },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const products = await fetchLiveBigCommerceCatalog('abc123def', 'real_token_123');

    expect(products).toEqual([{ id: 1, name: 'Live Product' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('https://api.bigcommerce.com/stores/abc123def/v3/catalog/products');
    expect(String(url)).toContain('page=1');
    expect(init.headers['X-Auth-Token']).toBe('real_token_123');
  });

  it('follows pagination pages until exhausted and aggregates all products', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 1, name: 'Page 1 Product' }],
          meta: { pagination: { current_page: 1, total_pages: 2 } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: 2, name: 'Page 2 Product' }],
          meta: { pagination: { current_page: 2, total_pages: 2 } },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const products = await fetchLiveBigCommerceCatalog('abc123def', 'real_token_123');

    expect(products.map((p) => p.id)).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('page=2');
  });

  it('throws with the response status when BigCommerce returns a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      })
    );

    await expect(fetchLiveBigCommerceCatalog('abc123def', 'bad_token')).rejects.toThrow(/401/);
  });
});
