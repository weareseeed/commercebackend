import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchLiveShopifyCatalog,
  isPlaceholderShopifyToken,
  isPlaceholderShopifyShopDomain,
  parseNextLinkHeader,
  shopifyApiBaseUrl,
} from './live-client.js';

describe('isPlaceholderShopifyToken', () => {
  it('treats unset, empty, and placeholder-looking values as placeholders', () => {
    expect(isPlaceholderShopifyToken(undefined)).toBe(true);
    expect(isPlaceholderShopifyToken('')).toBe(true);
    expect(isPlaceholderShopifyToken('your_shopify_admin_access_token')).toBe(true);
    expect(isPlaceholderShopifyToken('mock_token')).toBe(true);
    expect(isPlaceholderShopifyToken('PLACEHOLDER')).toBe(true);
  });

  it('treats a real-looking token as not a placeholder', () => {
    expect(isPlaceholderShopifyToken('shpat_example_real_looking_token')).toBe(false);
  });
});

describe('isPlaceholderShopifyShopDomain', () => {
  it('treats unset, empty, and placeholder-looking values as placeholders', () => {
    expect(isPlaceholderShopifyShopDomain(undefined)).toBe(true);
    expect(isPlaceholderShopifyShopDomain('')).toBe(true);
    expect(isPlaceholderShopifyShopDomain('your-store.myshopify.com')).toBe(true);
  });

  it('treats a real-looking shop domain as not a placeholder', () => {
    expect(isPlaceholderShopifyShopDomain('commercebackend-dev.myshopify.com')).toBe(false);
  });
});

describe('shopifyApiBaseUrl', () => {
  it('builds the pinned-version Admin API base URL for a shop domain', () => {
    expect(shopifyApiBaseUrl('commercebackend-dev.myshopify.com')).toBe(
      'https://commercebackend-dev.myshopify.com/admin/api/2024-01'
    );
  });
});

describe('parseNextLinkHeader', () => {
  it('returns undefined when there is no Link header', () => {
    expect(parseNextLinkHeader(null)).toBeUndefined();
  });

  it('returns undefined when the Link header has no rel="next"', () => {
    expect(
      parseNextLinkHeader('<https://shop.myshopify.com/admin/api/2024-01/products.json?page_info=a>; rel="previous"')
    ).toBeUndefined();
  });

  it('extracts the rel="next" URL among multiple links', () => {
    const header =
      '<https://shop.myshopify.com/admin/api/2024-01/products.json?page_info=prev>; rel="previous", ' +
      '<https://shop.myshopify.com/admin/api/2024-01/products.json?page_info=next>; rel="next"';
    expect(parseNextLinkHeader(header)).toBe(
      'https://shop.myshopify.com/admin/api/2024-01/products.json?page_info=next'
    );
  });
});

describe('fetchLiveShopifyCatalog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches a single page and sends the expected auth headers against the shop domain', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [{ id: 1, title: 'Live Product' }] }),
      headers: { get: () => null },
    });
    vi.stubGlobal('fetch', fetchMock);

    const products = await fetchLiveShopifyCatalog('commercebackend-dev.myshopify.com', 'shpat_real_token');

    expect(products).toEqual([{ id: 1, title: 'Live Product' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      'https://commercebackend-dev.myshopify.com/admin/api/2024-01/products.json'
    );
    expect(init.headers['X-Shopify-Access-Token']).toBe('shpat_real_token');
  });

  it('follows Link-header pagination until exhausted and aggregates all products', async () => {
    const nextUrl = 'https://commercebackend-dev.myshopify.com/admin/api/2024-01/products.json?page_info=p2';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [{ id: 1, title: 'Page 1 Product' }] }),
        headers: { get: () => `<${nextUrl}>; rel="next"` },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [{ id: 2, title: 'Page 2 Product' }] }),
        headers: { get: () => null },
      });
    vi.stubGlobal('fetch', fetchMock);

    const products = await fetchLiveShopifyCatalog('commercebackend-dev.myshopify.com', 'shpat_real_token');

    expect(products.map((p) => p.id)).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toBe(nextUrl);
  });

  it('throws with the response status when Shopify returns a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      })
    );

    await expect(
      fetchLiveShopifyCatalog('commercebackend-dev.myshopify.com', 'bad_token')
    ).rejects.toThrow(/401/);
  });

  it('throws when the Shopify response body carries an errors field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ errors: 'Invalid API key or access token' }),
        headers: { get: () => null },
      })
    );

    await expect(
      fetchLiveShopifyCatalog('commercebackend-dev.myshopify.com', 'bad_token')
    ).rejects.toThrow(/Invalid API key/);
  });
});
