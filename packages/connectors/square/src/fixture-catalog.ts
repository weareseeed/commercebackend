import fixture from './fixtures/square-catalog-fixture.json';
import type { SquareCatalogObjectLike } from './mapper.js';

/**
 * A static fixture standing in for a Square "List Catalog" API response.
 * This is a read-only spike (weekly backlog item 9): there is no live Square
 * API call and no Square credentials anywhere in this package. A real
 * connector would fetch this shape from Square instead.
 */
export function loadSquareCatalogFixture(): SquareCatalogObjectLike[] {
  return fixture.objects as SquareCatalogObjectLike[];
}
