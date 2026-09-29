import type { SquareCatalogObjectLike } from './mapper.js';

/**
 * Detects placeholder / unset Square sandbox access tokens (mirrors
 * `isPlaceholderStripeKey` in `packages/payments/stripe/src/client.ts`, the
 * same "mocked mode" convention used across this repo). Any of these leaves
 * `loadSquareCatalog` on the existing fixture-driven spike behavior.
 */
export function isPlaceholderSquareToken(val: string | undefined): boolean {
  if (!val) return true;
  const v = val.toLowerCase();
  return v.includes('placeholder') || v.includes('mock') || v.includes('your_') || v === '';
}

export type SquareEnvironment = 'sandbox' | 'production';

export function squareApiBaseUrl(environment: SquareEnvironment): string {
  return environment === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

/** Pinned Square API version, same convention as the pinned Stripe apiVersion
 * in `packages/payments/stripe/src/client.ts`. Bump deliberately, not as a
 * drive-by change. */
const SQUARE_API_VERSION = '2024-01-18';

interface SquareListCatalogResponse {
  objects?: SquareCatalogObjectLike[];
  cursor?: string;
  errors?: Array<{ category?: string; code?: string; detail?: string }>;
}

/**
 * Fetches every `ITEM` catalog object from a real Square account (sandbox by
 * default) via the List Catalog API, following pagination cursors until
 * exhausted. Used by `loadSquareCatalog` only when a real (non-placeholder)
 * `SQUARE_ACCESS_TOKEN` is configured; otherwise the static fixture is used
 * instead, so this function is never called with no credentials.
 *
 * Known limitation: Square's Catalog API does not return per-variation
 * inventory counts (that's a separate Inventory API this connector does not
 * call yet), so `mapSquareCatalogObjectToCanonical` defaults
 * `quantityAvailable` to 0 for live-fetched items unless a later iteration
 * adds that call.
 */
export async function fetchLiveSquareCatalog(
  accessToken: string,
  environment: SquareEnvironment = 'sandbox'
): Promise<SquareCatalogObjectLike[]> {
  const baseUrl = squareApiBaseUrl(environment);
  const objects: SquareCatalogObjectLike[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL('/v2/catalog/list', baseUrl);
    url.searchParams.set('types', 'ITEM');
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Square-Version': SQUARE_API_VERSION,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Square List Catalog request failed with status ${response.status}${body ? `: ${body}` : ''}`
      );
    }

    const body = (await response.json()) as SquareListCatalogResponse;
    if (body.errors && body.errors.length > 0) {
      throw new Error(
        `Square List Catalog returned errors: ${body.errors.map((e) => e.detail ?? e.code).join('; ')}`
      );
    }

    objects.push(...(body.objects ?? []));
    cursor = body.cursor;
  } while (cursor);

  return objects;
}
