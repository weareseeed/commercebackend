import { CanonicalCatalogItem, CatalogMappingError } from './types.js';

/**
 * Minimal shape of a BigCommerce Catalog v3 `Product` this mapper reads (as
 * returned by `GET /catalog/products`). Not the full BigCommerce API type —
 * only the fields this read-only spike needs. See
 * https://developer.bigcommerce.com/docs/rest-catalog/products.
 *
 * `categories` is a list of category names in the static fixture. BigCommerce's
 * live Products endpoint returns category *ids*, not names (a separate
 * Categories API call resolves them) — see the "known limitation" note in
 * `docs/api/connectors-bigcommerce.md`. Live-fetched items therefore fall
 * back to the `type`-based default below rather than a category match.
 */
export interface BigCommerceProductLike {
  id: number | string;
  name?: string;
  description?: string;
  /** BigCommerce's own product type — only `physical` and `digital` exist. */
  type?: string;
  price?: number | string;
  inventory_level?: number;
  /** `available`, `disabled`, or `preorder`. Disabled products are not
   * agent-shoppable listings. */
  availability?: string;
  categories?: Array<string | number>;
}

const BIGCOMMERCE_CATEGORY_TO_LISTING_TYPE: Record<string, CanonicalCatalogItem['type']> = {
  'physical good': 'physical_good',
  'digital good': 'digital_good',
  service: 'service',
  'event ticket': 'event_ticket',
};

/**
 * Maps one BigCommerce `Product` to CommerceBackend's canonical catalog item
 * shape. A disabled product is not an agent-shoppable listing — callers
 * should skip it, not treat it as a mapping failure. Returns `null` for that
 * case; throws `CatalogMappingError` for a non-disabled product missing data
 * this shape requires (a name or a usable price).
 */
export function mapBigCommerceProductToCanonical(
  product: BigCommerceProductLike
): CanonicalCatalogItem | null {
  if (product.availability === 'disabled') {
    return null;
  }

  if (!product.name) {
    throw new CatalogMappingError(
      product.id != null ? String(product.id) : null,
      'BigCommerce product is missing a name.'
    );
  }

  const priceAmount =
    product.price !== undefined ? Math.round(parseFloat(String(product.price)) * 100) : NaN;
  if (product.price === undefined || Number.isNaN(priceAmount)) {
    throw new CatalogMappingError(String(product.id), 'BigCommerce product has no usable price.');
  }

  const categoryName =
    product.categories && product.categories.length > 0 ? String(product.categories[0]) : '';
  const listingType =
    BIGCOMMERCE_CATEGORY_TO_LISTING_TYPE[categoryName.trim().toLowerCase()] ??
    (product.type === 'digital' ? 'digital_good' : 'physical_good');

  return {
    externalId: String(product.id),
    title: product.name,
    description: product.description ?? '',
    type: listingType,
    priceAmount,
    // BigCommerce's product payload does not carry a currency field (it's a
    // store-level setting fetched separately); this read-only spike fixes it
    // to USD, the same convention `mapShopifyProductToCanonical` uses.
    currency: 'USD',
    quantityAvailable: product.inventory_level ?? 0,
    attributes: {
      source: 'bigcommerce',
      bigcommerceCategory: product.categories?.[0] != null ? String(product.categories[0]) : null,
    },
  };
}
