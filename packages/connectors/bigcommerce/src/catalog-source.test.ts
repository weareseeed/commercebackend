import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { loadBigCommerceCatalog } from './catalog-source.js';
import { loadBigCommerceCatalogFixture } from './fixture-catalog.js';

describe('loadBigCommerceCatalog', () => {
  const originalStoreHash = process.env.BIGCOMMERCE_STORE_HASH;
  const originalToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;

  beforeEach(() => {
    delete process.env.BIGCOMMERCE_STORE_HASH;
    delete process.env.BIGCOMMERCE_ACCESS_TOKEN;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalStoreHash === undefined) delete process.env.BIGCOMMERCE_STORE_HASH;
    else process.env.BIGCOMMERCE_STORE_HASH = originalStoreHash;
    if (originalToken === undefined) delete process.env.BIGCOMMERCE_ACCESS_TOKEN;
    else process.env.BIGCOMMERCE_ACCESS_TOKEN = originalToken;
  });

  it('falls back to the static fixture when both env vars are unset', async () => {
    const products = await loadBigCommerceCatalog();
    expect(products).toEqual(loadBigCommerceCatalogFixture());
  });

  it('falls back to the static fixture when only the store hash is configured', async () => {
    process.env.BIGCOMMERCE_STORE_HASH = 'abc123def';
    const products = await loadBigCommerceCatalog();
    expect(products).toEqual(loadBigCommerceCatalogFixture());
  });

  it('falls back to the static fixture when values are obvious placeholders', async () => {
    process.env.BIGCOMMERCE_STORE_HASH = 'your_store_hash';
    process.env.BIGCOMMERCE_ACCESS_TOKEN = 'your_bigcommerce_access_token';
    const products = await loadBigCommerceCatalog();
    expect(products).toEqual(loadBigCommerceCatalogFixture());
  });

  it('fetches from the live BigCommerce API when real credentials are configured', async () => {
    process.env.BIGCOMMERCE_STORE_HASH = 'abc123def';
    process.env.BIGCOMMERCE_ACCESS_TOKEN = 'real_looking_token_abc123';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: 1, name: 'Live Product' }],
        meta: { pagination: { current_page: 1, total_pages: 1 } },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const products = await loadBigCommerceCatalog();

    expect(products).toEqual([{ id: 1, name: 'Live Product' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('api.bigcommerce.com/stores/abc123def');
  });
});
