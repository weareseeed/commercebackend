import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { loadShopifyCatalog } from './catalog-source.js';
import { loadShopifyCatalogFixture } from './fixture-catalog.js';

describe('loadShopifyCatalog', () => {
  const originalShopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  const originalToken = process.env.SHOPIFY_ACCESS_TOKEN;

  beforeEach(() => {
    delete process.env.SHOPIFY_SHOP_DOMAIN;
    delete process.env.SHOPIFY_ACCESS_TOKEN;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalShopDomain === undefined) delete process.env.SHOPIFY_SHOP_DOMAIN;
    else process.env.SHOPIFY_SHOP_DOMAIN = originalShopDomain;
    if (originalToken === undefined) delete process.env.SHOPIFY_ACCESS_TOKEN;
    else process.env.SHOPIFY_ACCESS_TOKEN = originalToken;
  });

  it('falls back to the static fixture when neither env var is set', async () => {
    const products = await loadShopifyCatalog();
    expect(products).toEqual(loadShopifyCatalogFixture());
  });

  it('falls back to the static fixture when only the access token is set', async () => {
    process.env.SHOPIFY_ACCESS_TOKEN = 'shpat_real_token';
    const products = await loadShopifyCatalog();
    expect(products).toEqual(loadShopifyCatalogFixture());
  });

  it('falls back to the static fixture when the shop domain looks like a placeholder', async () => {
    process.env.SHOPIFY_SHOP_DOMAIN = 'your-store.myshopify.com';
    process.env.SHOPIFY_ACCESS_TOKEN = 'shpat_real_token';
    const products = await loadShopifyCatalog();
    expect(products).toEqual(loadShopifyCatalogFixture());
  });

  it('fetches from the live Shopify Admin API when both env vars are configured', async () => {
    process.env.SHOPIFY_SHOP_DOMAIN = 'commercebackend-dev.myshopify.com';
    process.env.SHOPIFY_ACCESS_TOKEN = 'shpat_real_token';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [{ id: 1, title: 'Live Product' }] }),
      headers: { get: () => null },
    });
    vi.stubGlobal('fetch', fetchMock);

    const products = await loadShopifyCatalog();

    expect(products).toEqual([{ id: 1, title: 'Live Product' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('commercebackend-dev.myshopify.com');
  });
});
