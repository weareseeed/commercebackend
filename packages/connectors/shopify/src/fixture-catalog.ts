import fixture from './fixtures/shopify-catalog-fixture.json';
import type { ShopifyProductLike } from './mapper.js';

/**
 * A static fixture standing in for a Shopify Admin API
 * `GET /admin/api/2024-01/products.json` response. Used by default (weekly
 * backlog item 8, a read-only spike); `loadShopifyCatalog` in
 * `./catalog-source.js` switches to the real Shopify Admin API instead when
 * `SHOPIFY_SHOP_DOMAIN` and `SHOPIFY_ACCESS_TOKEN` are configured — see
 * `docs/api/connectors-shopify.md`.
 */
export function loadShopifyCatalogFixture(): ShopifyProductLike[] {
  return fixture.products as ShopifyProductLike[];
}
