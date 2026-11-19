import type { WooCommerceProductLike } from './mapper.js';

/**
 * Detects placeholder / unset WooCommerce credentials (mirrors
 * `isPlaceholderBigCommerceToken`/`isPlaceholderBigCommerceStoreHash` in
 * `packages/connectors/bigcommerce/src/live-client.ts`, the same "mocked
 * mode" convention used across this repo). Any of these leaves
 * `loadWooCommerceCatalog` on the existing fixture-driven spike behavior.
 */
export function isPlaceholderWooCommerceSiteUrl(val: string | undefined): boolean {
  if (!val) return true;
  const v = val.toLowerCase();
  return v.includes('placeholder') || v.includes('your-store') || v.includes('your_') || v === '';
}

export function isPlaceholderWooCommerceConsumerKey(val: string | undefined): boolean {
  if (!val) return true;
  const v = val.toLowerCase();
  return v.includes('placeholder') || v.includes('mock') || v.includes('your_') || v === '';
}

export function isPlaceholderWooCommerceConsumerSecret(val: string | undefined): boolean {
  if (!val) return true;
  const v = val.toLowerCase();
  return v.includes('placeholder') || v.includes('mock') || v.includes('your_') || v === '';
}

/** Normalizes an operator-supplied site URL into the WooCommerce REST API v3
 * base URL, same convention as the pinned Square `Square-Version` header and
 * BigCommerce's store-scoped `v3` base URL. Bump deliberately, not as a
 * drive-by change. */
export function wooCommerceApiBaseUrl(siteUrl: string): string {
  let trimmed = siteUrl;
  while (trimmed.endsWith('/')) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}/wp-json/wc/v3`;
}

/**
 * Fetches every product from a real WooCommerce store's REST API (the
 * operator's own store by default — never a third-party merchant's) via
 * `GET /products`, following WooCommerce's `X-WP-TotalPages` response header
 * until exhausted. Used by `loadWooCommerceCatalog` only when a real
 * (non-placeholder) `WOOCOMMERCE_SITE_URL`, `WOOCOMMERCE_CONSUMER_KEY`, and
 * `WOOCOMMERCE_CONSUMER_SECRET` are all configured; otherwise the static
 * fixture is used instead, so this function is never called with no
 * credentials.
 *
 * Auth follows WooCommerce's documented HTTPS query-string authentication
 * (`consumer_key`/`consumer_secret` as query parameters) rather than OAuth
 * 1.0a, which WooCommerce itself reserves for non-HTTPS sites — see
 * https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication.
 */
export async function fetchLiveWooCommerceCatalog(
  siteUrl: string,
  consumerKey: string,
  consumerSecret: string
): Promise<WooCommerceProductLike[]> {
  const baseUrl = wooCommerceApiBaseUrl(siteUrl);
  const products: WooCommerceProductLike[] = [];
  let page = 1;

  for (;;) {
    const url = new URL(`${baseUrl}/products`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', '100');
    url.searchParams.set('consumer_key', consumerKey);
    url.searchParams.set('consumer_secret', consumerSecret);

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `WooCommerce List Products request failed with status ${response.status}${body ? `: ${body}` : ''}`
      );
    }

    const body = (await response.json()) as WooCommerceProductLike[];
    products.push(...body);

    const totalPagesHeader = response.headers.get('X-WP-TotalPages');
    const totalPages = totalPagesHeader ? parseInt(totalPagesHeader, 10) : page;
    if (!Number.isFinite(totalPages) || page >= totalPages) {
      break;
    }
    page += 1;
  }

  return products;
}
