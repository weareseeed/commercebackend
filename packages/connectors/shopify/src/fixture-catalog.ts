import fixture from './fixtures/shopify-catalog-fixture.json';
import type { ShopifyProductLike } from './mapper.js';

/**
 * A static fixture standing in for a Shopify Admin API
 * `GET /admin/api/2024-01/products.json` response. This is a read-only spike
 * (weekly backlog item 8): there is no live Shopify API call and no Shopify
 * credentials anywhere in this package. A real connector would fetch this
 * shape from a merchant's Shopify store instead.
 */
export function loadShopifyCatalogFixture(): ShopifyProductLike[] {
  return fixture.products as ShopifyProductLike[];
}
