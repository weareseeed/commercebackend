import type { ShopifyProductLike } from './mapper.js';
import { loadShopifyCatalogFixture } from './fixture-catalog.js';
import {
  fetchLiveShopifyCatalog,
  isPlaceholderShopifyShopDomain,
  isPlaceholderShopifyToken,
} from './live-client.js';

/**
 * Chooses the Shopify catalog source the same way `loadSquareCatalog` and
 * `getStripeClient` choose between the mock and real source: a real
 * (non-placeholder) `SHOPIFY_SHOP_DOMAIN` and `SHOPIFY_ACCESS_TOKEN` fetch
 * from the live Shopify Admin API (whichever store `SHOPIFY_SHOP_DOMAIN`
 * names — a development/sandbox store by convention); anything else — either
 * unset, empty, or an obvious placeholder — keeps the original fixture-driven
 * spike behavior. This is the only place that decides live vs. fixture, so
 * `CatalogSyncService` doesn't need to know which one it got.
 */
export async function loadShopifyCatalog(): Promise<ShopifyProductLike[]> {
  const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
  if (isPlaceholderShopifyShopDomain(shopDomain) || isPlaceholderShopifyToken(accessToken)) {
    return loadShopifyCatalogFixture();
  }

  return fetchLiveShopifyCatalog(shopDomain as string, accessToken as string);
}
