import fixture from './fixtures/square-catalog-fixture.json';
import type { SquareCatalogObjectLike } from './mapper.js';

/**
 * A static fixture standing in for a Square "List Catalog" API response.
 * This loader itself makes no live Square API call and reads no credentials
 * — it's the default, no-setup-required catalog source (weekly backlog item
 * 9). When a real `SQUARE_ACCESS_TOKEN` is configured, `catalog-source.ts`'s
 * `loadSquareCatalog` uses `live-client.ts` to fetch the same shape from a
 * real Square account instead; this fixture then becomes unused.
 */
export function loadSquareCatalogFixture(): SquareCatalogObjectLike[] {
  return fixture.objects as SquareCatalogObjectLike[];
}
