import type { BigCommerceProductLike } from './mapper.js';

/**
 * Detects placeholder / unset BigCommerce credentials (mirrors
 * `isPlaceholderShopifyToken`/`isPlaceholderShopifyShopDomain` in
 * `packages/connectors/shopify/src/live-client.ts`, the same "mocked mode"
 * convention used across this repo). Any of these leaves
 * `loadBigCommerceCatalog` on the existing fixture-driven spike behavior.
 */
export function isPlaceholderBigCommerceToken(val: string | undefined): boolean {
  if (!val) return true;
  const v = val.toLowerCase();
  return v.includes('placeholder') || v.includes('mock') || v.includes('your_') || v === '';
}

/**
 * Same "is this a real value" check as `isPlaceholderBigCommerceToken`,
 * applied to the store hash instead of the access token. Both must be a real
 * value for live mode to activate.
 */
export function isPlaceholderBigCommerceStoreHash(val: string | undefined): boolean {
  if (!val) return true;
  const v = val.toLowerCase();
  return v.includes('placeholder') || v.includes('your_') || v.includes('store_hash') || v === '';
}

/** Pinned BigCommerce Catalog API version path, same convention as the
 * pinned Square `Square-Version` header and Shopify Admin API version. Bump
 * deliberately, not as a drive-by change. */
export function bigCommerceApiBaseUrl(storeHash: string): string {
  return `https://api.bigcommerce.com/stores/${storeHash}/v3`;
}

interface BigCommerceProductsResponse {
  data?: BigCommerceProductLike[];
  meta?: {
    pagination?: {
      current_page?: number;
      total_pages?: number;
    };
  };
}

/**
 * Fetches every product from a real BigCommerce store's Catalog API (the
 * operator's own store by default — never a third-party merchant's) via
 * `GET /catalog/products`, following `meta.pagination` page numbers until
 * exhausted. Used by `loadBigCommerceCatalog` only when both a real
 * (non-placeholder) `BIGCOMMERCE_STORE_HASH` and `BIGCOMMERCE_ACCESS_TOKEN`
 * are configured; otherwise the static fixture is used instead, so this
 * function is never called with no credentials.
 *
 * Known limitation: BigCommerce's Products endpoint returns category *ids*,
 * not names, so `categories` here are numeric-looking strings that will not
 * match `mapBigCommerceProductToCanonical`'s named category lookup — live
 * mode always falls back to the `type`-based physical/digital default. See
 * `docs/api/connectors-bigcommerce.md`.
 */
export async function fetchLiveBigCommerceCatalog(
  storeHash: string,
  accessToken: string
): Promise<BigCommerceProductLike[]> {
  const baseUrl = bigCommerceApiBaseUrl(storeHash);
  const products: BigCommerceProductLike[] = [];
  let page = 1;

  for (;;) {
    const url = new URL(`${baseUrl}/catalog/products`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', '250');
    url.searchParams.set('include', 'categories');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Auth-Token': accessToken,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `BigCommerce List Products request failed with status ${response.status}${body ? `: ${body}` : ''}`
      );
    }

    const body = (await response.json()) as BigCommerceProductsResponse;
    products.push(...(body.data ?? []));

    const pagination = body.meta?.pagination;
    const currentPage = pagination?.current_page ?? page;
    const totalPages = pagination?.total_pages ?? currentPage;
    if (currentPage >= totalPages) {
      break;
    }
    page = currentPage + 1;
  }

  return products;
}
