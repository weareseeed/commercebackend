import type { BigCommerceProductLike } from './mapper.js';
import { loadBigCommerceCatalogFixture } from './fixture-catalog.js';
import {
  fetchLiveBigCommerceCatalog,
  isPlaceholderBigCommerceStoreHash,
  isPlaceholderBigCommerceToken,
} from './live-client.js';

/**
 * Chooses the BigCommerce catalog source the same way `loadShopifyCatalog`
 * and `loadSquareCatalog` do: real (non-placeholder) `BIGCOMMERCE_STORE_HASH`
 * and `BIGCOMMERCE_ACCESS_TOKEN` values fetch from the live BigCommerce
 * Catalog API (the operator's own store); anything else — either unset,
 * empty, or an obvious placeholder — keeps the original fixture-driven spike
 * behavior. This is the only place that decides live vs. fixture, so
 * `CatalogSyncService` doesn't need to know which one it got.
 */
export async function loadBigCommerceCatalog(): Promise<BigCommerceProductLike[]> {
  const storeHash = process.env.BIGCOMMERCE_STORE_HASH;
  const accessToken = process.env.BIGCOMMERCE_ACCESS_TOKEN;

  if (isPlaceholderBigCommerceStoreHash(storeHash) || isPlaceholderBigCommerceToken(accessToken)) {
    return loadBigCommerceCatalogFixture();
  }

  return fetchLiveBigCommerceCatalog(storeHash as string, accessToken as string);
}
