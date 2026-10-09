import type { WooCommerceProductLike } from './mapper.js';
import { loadWooCommerceCatalogFixture } from './fixture-catalog.js';
import {
  fetchLiveWooCommerceCatalog,
  isPlaceholderWooCommerceSiteUrl,
  isPlaceholderWooCommerceConsumerKey,
  isPlaceholderWooCommerceConsumerSecret,
} from './live-client.js';

/**
 * Chooses the WooCommerce catalog source the same way `loadBigCommerceCatalog`,
 * `loadShopifyCatalog`, and `loadSquareCatalog` do: real (non-placeholder)
 * `WOOCOMMERCE_SITE_URL`, `WOOCOMMERCE_CONSUMER_KEY`, and
 * `WOOCOMMERCE_CONSUMER_SECRET` values fetch from the live WooCommerce REST
 * API (the operator's own store); anything else — either unset, empty, or an
 * obvious placeholder — keeps the original fixture-driven spike behavior.
 * This is the only place that decides live vs. fixture, so
 * `CatalogSyncService` doesn't need to know which one it got.
 */
export async function loadWooCommerceCatalog(): Promise<WooCommerceProductLike[]> {
  const siteUrl = process.env.WOOCOMMERCE_SITE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (
    isPlaceholderWooCommerceSiteUrl(siteUrl) ||
    isPlaceholderWooCommerceConsumerKey(consumerKey) ||
    isPlaceholderWooCommerceConsumerSecret(consumerSecret)
  ) {
    return loadWooCommerceCatalogFixture();
  }

  return fetchLiveWooCommerceCatalog(siteUrl as string, consumerKey as string, consumerSecret as string);
}
