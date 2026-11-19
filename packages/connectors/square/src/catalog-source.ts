import type { SquareCatalogObjectLike } from './mapper.js';
import { loadSquareCatalogFixture } from './fixture-catalog.js';
import {
  fetchLiveSquareCatalog,
  isPlaceholderSquareToken,
  type SquareEnvironment,
} from './live-client.js';

/**
 * Chooses the Square catalog source the same way `getStripeClient` chooses
 * between the mock and real Stripe client: a real (non-placeholder)
 * `SQUARE_ACCESS_TOKEN` fetches from the live Square Catalog API (sandbox by
 * default, or production when `SQUARE_ENVIRONMENT=production`); anything
 * else — unset, empty, or an obvious placeholder — keeps the original
 * fixture-driven spike behavior. This is the only place that decides live vs.
 * fixture, so `CatalogSyncService` doesn't need to know which one it got.
 */
export async function loadSquareCatalog(): Promise<SquareCatalogObjectLike[]> {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (isPlaceholderSquareToken(accessToken)) {
    return loadSquareCatalogFixture();
  }

  const environment: SquareEnvironment =
    process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
  return fetchLiveSquareCatalog(accessToken as string, environment);
}
