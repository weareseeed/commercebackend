import type { ShopifyProductLike } from './mapper.js';

/**
 * Detects placeholder / unset Shopify credentials (mirrors
 * `isPlaceholderSquareToken` in `packages/connectors/square/src/live-client.ts`
 * and `isPlaceholderStripeKey` in `packages/payments/stripe/src/client.ts`,
 * the same "mocked mode" convention used across this repo). Any of these
 * leaves `loadShopifyCatalog` on the existing fixture-driven spike behavior.
 */
export function isPlaceholderShopifyToken(val: string | undefined): boolean {
  if (!val) return true;
  const v = val.toLowerCase();
  return v.includes('placeholder') || v.includes('mock') || v.includes('your_') || v === '';
}

/**
 * Same "is this a real value" check as `isPlaceholderShopifyToken`, applied
 * to the shop domain instead of the access token. Both must be a real value
 * for live mode to activate.
 */
export function isPlaceholderShopifyShopDomain(val: string | undefined): boolean {
  if (!val) return true;
  const v = val.toLowerCase();
  return v.includes('placeholder') || v.includes('your-') || v.includes('your_') || v === '';
}

/** Pinned Shopify Admin API version, same convention as the pinned Square
 * `Square-Version` header and Stripe `apiVersion` in this repo. Bump
 * deliberately, not as a drive-by change. */
const SHOPIFY_API_VERSION = '2024-01';

export function shopifyApiBaseUrl(shopDomain: string): string {
  return `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}`;
}

interface ShopifyProductsResponse {
  products?: ShopifyProductLike[];
  errors?: unknown;
}

/** Extracts the `rel="next"` URL from a Shopify Admin API `Link` response
 * header, e.g. `<https://shop.myshopify.com/...&page_info=abc>; rel="next"`.
 * Returns `undefined` when there is no next page. Parsed with plain string
 * splitting rather than a regex, since the header content comes from an HTTP
 * response and an unbounded regex over untrusted input is a ReDoS risk. */
export function parseNextLinkHeader(linkHeader: string | null): string | undefined {
  if (!linkHeader) return undefined;

  for (const part of linkHeader.split(',')) {
    const segments = part.split(';').map((segment) => segment.trim());
    const urlSegment = segments[0];
    const isNext = segments
      .slice(1)
      .some((segment) => segment.split(' ').join('') === 'rel="next"');

    if (isNext && urlSegment.startsWith('<') && urlSegment.endsWith('>')) {
      return urlSegment.slice(1, -1);
    }
  }

  return undefined;
}

/**
 * Fetches every product from a real Shopify store's Admin API (a Shopify
 * development/sandbox store by default — whichever `shopDomain` names) via
 * `GET /admin/api/{version}/products.json`, following `Link`-header
 * pagination until exhausted. Used by `loadShopifyCatalog` only when both a
 * real (non-placeholder) `SHOPIFY_SHOP_DOMAIN` and `SHOPIFY_ACCESS_TOKEN` are
 * configured; otherwise the static fixture is used instead, so this function
 * is never called with no credentials.
 *
 * Known limitation: like the Square live client, this maps the same
 * `ShopifyProductLike` shape the fixture uses, so all the fixture-mode
 * limitations (single variant, no store currency lookup) apply to live mode
 * too — see `docs/api/connectors-shopify.md`.
 */
export async function fetchLiveShopifyCatalog(
  shopDomain: string,
  accessToken: string
): Promise<ShopifyProductLike[]> {
  const baseUrl = shopifyApiBaseUrl(shopDomain);
  const products: ShopifyProductLike[] = [];
  let nextUrl: string | undefined = `${baseUrl}/products.json?limit=250`;

  while (nextUrl) {
    const response: Response = await fetch(nextUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Shopify List Products request failed with status ${response.status}${body ? `: ${body}` : ''}`
      );
    }

    const body = (await response.json()) as ShopifyProductsResponse;
    if (body.errors) {
      throw new Error(`Shopify List Products returned errors: ${JSON.stringify(body.errors)}`);
    }

    products.push(...(body.products ?? []));
    nextUrl = parseNextLinkHeader(response.headers.get('link'));
  }

  return products;
}
