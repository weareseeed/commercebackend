import fixture from './fixtures/bigcommerce-catalog-fixture.json';
import type { BigCommerceProductLike } from './mapper.js';

/**
 * A static fixture standing in for a BigCommerce Catalog v3 "List Products"
 * API response. This loader itself makes no live BigCommerce API call and
 * reads no credentials — it's the default, no-setup-required catalog source
 * (weekly backlog item 13). When real `BIGCOMMERCE_STORE_HASH` /
 * `BIGCOMMERCE_ACCESS_TOKEN` are configured, `catalog-source.ts`'s
 * `loadBigCommerceCatalog` uses `live-client.ts` to fetch the same shape from
 * a real BigCommerce store instead; this fixture then becomes unused.
 */
export function loadBigCommerceCatalogFixture(): BigCommerceProductLike[] {
  return fixture.products as BigCommerceProductLike[];
}
