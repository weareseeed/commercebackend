import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { loadWooCommerceCatalog } from './catalog-source.js';
import { loadWooCommerceCatalogFixture } from './fixture-catalog.js';

describe('loadWooCommerceCatalog', () => {
  const originalSiteUrl = process.env.WOOCOMMERCE_SITE_URL;
  const originalKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const originalSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  beforeEach(() => {
    delete process.env.WOOCOMMERCE_SITE_URL;
    delete process.env.WOOCOMMERCE_CONSUMER_KEY;
    delete process.env.WOOCOMMERCE_CONSUMER_SECRET;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalSiteUrl === undefined) delete process.env.WOOCOMMERCE_SITE_URL;
    else process.env.WOOCOMMERCE_SITE_URL = originalSiteUrl;
    if (originalKey === undefined) delete process.env.WOOCOMMERCE_CONSUMER_KEY;
    else process.env.WOOCOMMERCE_CONSUMER_KEY = originalKey;
    if (originalSecret === undefined) delete process.env.WOOCOMMERCE_CONSUMER_SECRET;
    else process.env.WOOCOMMERCE_CONSUMER_SECRET = originalSecret;
  });

  it('falls back to the static fixture when all env vars are unset', async () => {
    const products = await loadWooCommerceCatalog();
    expect(products).toEqual(loadWooCommerceCatalogFixture());
  });

  it('falls back to the static fixture when only the site URL is configured', async () => {
    process.env.WOOCOMMERCE_SITE_URL = 'https://shop.example.com';
    const products = await loadWooCommerceCatalog();
    expect(products).toEqual(loadWooCommerceCatalogFixture());
  });

  it('falls back to the static fixture when values are obvious placeholders', async () => {
    process.env.WOOCOMMERCE_SITE_URL = 'https://your-store.example.com';
    process.env.WOOCOMMERCE_CONSUMER_KEY = 'your_woocommerce_consumer_key';
    process.env.WOOCOMMERCE_CONSUMER_SECRET = 'your_woocommerce_consumer_secret';
    const products = await loadWooCommerceCatalog();
    expect(products).toEqual(loadWooCommerceCatalogFixture());
  });

  it('fetches from the live WooCommerce API when real credentials are configured', async () => {
    process.env.WOOCOMMERCE_SITE_URL = 'https://shop.example.com';
    process.env.WOOCOMMERCE_CONSUMER_KEY = 'ck_real_looking_key_abc123';
    process.env.WOOCOMMERCE_CONSUMER_SECRET = 'cs_real_looking_secret_abc123';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, name: 'Live Product' }],
      headers: { get: (name: string) => (name === 'X-WP-TotalPages' ? '1' : null) },
    });
    vi.stubGlobal('fetch', fetchMock);

    const products = await loadWooCommerceCatalog();

    expect(products).toEqual([{ id: 1, name: 'Live Product' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('shop.example.com/wp-json/wc/v3');
  });
});
