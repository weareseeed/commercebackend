import fixture from './fixtures/woocommerce-catalog-fixture.json';
import type { WooCommerceProductLike } from './mapper.js';

/**
 * A static fixture standing in for a WooCommerce REST API "List Products"
 * (`GET /wp-json/wc/v3/products`) response. This loader itself makes no live
 * WooCommerce API call and reads no credentials — it's the default,
 * no-setup-required catalog source (weekly backlog item 15). When real
 * `WOOCOMMERCE_SITE_URL` / `WOOCOMMERCE_CONSUMER_KEY` /
 * `WOOCOMMERCE_CONSUMER_SECRET` are configured, `catalog-source.ts`'s
 * `loadWooCommerceCatalog` uses `live-client.ts` to fetch the same shape from
 * a real WooCommerce store instead; this fixture then becomes unused.
 */
export function loadWooCommerceCatalogFixture(): WooCommerceProductLike[] {
  return fixture.products as WooCommerceProductLike[];
}
