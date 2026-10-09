import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchLiveWooCommerceCatalog,
  isPlaceholderWooCommerceSiteUrl,
  isPlaceholderWooCommerceConsumerKey,
  isPlaceholderWooCommerceConsumerSecret,
  wooCommerceApiBaseUrl,
} from './live-client.js';

describe('isPlaceholderWooCommerceSiteUrl', () => {
  it('treats unset, empty, and placeholder-looking values as placeholders', () => {
    expect(isPlaceholderWooCommerceSiteUrl(undefined)).toBe(true);
    expect(isPlaceholderWooCommerceSiteUrl('')).toBe(true);
    expect(isPlaceholderWooCommerceSiteUrl('https://your-store.example.com')).toBe(true);
  });

  it('treats a real-looking site URL as not a placeholder', () => {
    expect(isPlaceholderWooCommerceSiteUrl('https://shop.example.com')).toBe(false);
  });
});

describe('isPlaceholderWooCommerceConsumerKey', () => {
  it('treats unset, empty, and placeholder-looking values as placeholders', () => {
    expect(isPlaceholderWooCommerceConsumerKey(undefined)).toBe(true);
    expect(isPlaceholderWooCommerceConsumerKey('')).toBe(true);
    expect(isPlaceholderWooCommerceConsumerKey('your_woocommerce_consumer_key')).toBe(true);
    expect(isPlaceholderWooCommerceConsumerKey('mock_key')).toBe(true);
  });

  it('treats a real-looking consumer key as not a placeholder', () => {
    expect(isPlaceholderWooCommerceConsumerKey('ck_a1b2c3d4e5f6example')).toBe(false);
  });
});

describe('isPlaceholderWooCommerceConsumerSecret', () => {
  it('treats unset, empty, and placeholder-looking values as placeholders', () => {
    expect(isPlaceholderWooCommerceConsumerSecret(undefined)).toBe(true);
    expect(isPlaceholderWooCommerceConsumerSecret('')).toBe(true);
    expect(isPlaceholderWooCommerceConsumerSecret('your_woocommerce_consumer_secret')).toBe(true);
  });

  it('treats a real-looking consumer secret as not a placeholder', () => {
    expect(isPlaceholderWooCommerceConsumerSecret('cs_a1b2c3d4e5f6example')).toBe(false);
  });
});

describe('wooCommerceApiBaseUrl', () => {
  it('builds the REST API v3 base URL, stripping a trailing slash', () => {
    expect(wooCommerceApiBaseUrl('https://shop.example.com')).toBe(
      'https://shop.example.com/wp-json/wc/v3'
    );
    expect(wooCommerceApiBaseUrl('https://shop.example.com/')).toBe(
      'https://shop.example.com/wp-json/wc/v3'
    );
  });
});

describe('fetchLiveWooCommerceCatalog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches a single page and sends consumer key/secret as query params against the store host', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, name: 'Live Product' }],
      headers: { get: (name: string) => (name === 'X-WP-TotalPages' ? '1' : null) },
    });
    vi.stubGlobal('fetch', fetchMock);

    const products = await fetchLiveWooCommerceCatalog(
      'https://shop.example.com',
      'ck_real_key',
      'cs_real_secret'
    );

    expect(products).toEqual([{ id: 1, name: 'Live Product' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('https://shop.example.com/wp-json/wc/v3/products');
    expect(String(url)).toContain('consumer_key=ck_real_key');
    expect(String(url)).toContain('consumer_secret=cs_real_secret');
  });

  it('follows pagination pages until exhausted and aggregates all products', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, name: 'Page 1 Product' }],
        headers: { get: (name: string) => (name === 'X-WP-TotalPages' ? '2' : null) },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 2, name: 'Page 2 Product' }],
        headers: { get: (name: string) => (name === 'X-WP-TotalPages' ? '2' : null) },
      });
    vi.stubGlobal('fetch', fetchMock);

    const products = await fetchLiveWooCommerceCatalog(
      'https://shop.example.com',
      'ck_real_key',
      'cs_real_secret'
    );

    expect(products.map((p) => p.id)).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('page=2');
  });

  it('throws with the response status when WooCommerce returns a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      })
    );

    await expect(
      fetchLiveWooCommerceCatalog('https://shop.example.com', 'ck_bad', 'cs_bad')
    ).rejects.toThrow(/401/);
  });
});
