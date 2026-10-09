import { CanonicalCatalogItem, CatalogMappingError } from './types.js';

/**
 * Minimal shape of a WooCommerce REST API `Product` this mapper reads (as
 * returned by `GET /wp-json/wc/v3/products`). Not the full WooCommerce product
 * type — only the fields this read-only spike needs. See
 * https://woocommerce.github.io/woocommerce-rest-api-docs/#product-properties.
 *
 * Unlike BigCommerce's Products endpoint (which returns category *ids* only —
 * see the "known limitation" note in `docs/api/connectors-bigcommerce.md`),
 * WooCommerce's live `categories` field always includes the category `name`
 * alongside its `id`, so category-name matching works the same in fixture and
 * live mode here — no live-mode fallback limitation to document.
 */
export interface WooCommerceProductLike {
  id: number | string;
  name?: string;
  description?: string;
  /** WooCommerce's own product type: `simple`, `grouped`, `external`, or
   * `variable`. Not a physical/digital signal by itself — see `virtual`. */
  type?: string;
  /** `publish`, `draft`, `pending`, or `private`. Only `publish` is a public,
   * agent-shoppable listing. */
  status?: string;
  price?: string | number;
  stock_quantity?: number | null;
  /** `instock`, `outofstock`, or `onbackorder`. An `onbackorder` product is
   * treated the same as `instock` — still importable. */
  stock_status?: string;
  /** WooCommerce's downloadable/non-shippable product flag — the digital-good
   * signal when no category match applies. */
  virtual?: boolean;
  categories?: Array<{ id?: number | string; name?: string }>;
}

const WOOCOMMERCE_CATEGORY_TO_LISTING_TYPE: Record<string, CanonicalCatalogItem['type']> = {
  'physical good': 'physical_good',
  'digital good': 'digital_good',
  service: 'service',
  'event ticket': 'event_ticket',
};

/**
 * Maps one WooCommerce `Product` to CommerceBackend's canonical catalog item
 * shape. A non-`publish` product (draft/pending/private) is not an
 * agent-shoppable listing — callers should skip it, not treat it as a mapping
 * failure. Returns `null` for that case; throws `CatalogMappingError` for a
 * published product missing data this shape requires (a name or a usable
 * price).
 */
export function mapWooCommerceProductToCanonical(
  product: WooCommerceProductLike
): CanonicalCatalogItem | null {
  if (product.status !== undefined && product.status !== 'publish') {
    return null;
  }

  if (!product.name) {
    throw new CatalogMappingError(
      product.id != null ? String(product.id) : null,
      'WooCommerce product is missing a name.'
    );
  }

  const priceAmount =
    product.price !== undefined && product.price !== ''
      ? Math.round(parseFloat(String(product.price)) * 100)
      : NaN;
  if (product.price === undefined || product.price === '' || Number.isNaN(priceAmount)) {
    throw new CatalogMappingError(String(product.id), 'WooCommerce product has no usable price.');
  }

  const categoryName = product.categories && product.categories.length > 0 ? product.categories[0].name ?? '' : '';
  const listingType =
    WOOCOMMERCE_CATEGORY_TO_LISTING_TYPE[categoryName.trim().toLowerCase()] ??
    (product.virtual ? 'digital_good' : 'physical_good');

  return {
    externalId: String(product.id),
    title: product.name,
    description: product.description ?? '',
    type: listingType,
    priceAmount,
    // WooCommerce's product payload does not carry a currency field (it's a
    // store-level setting fetched separately); this read-only spike fixes it
    // to USD, the same convention the Square/Shopify/BigCommerce connectors use.
    currency: 'USD',
    quantityAvailable: product.stock_quantity ?? 0,
    attributes: {
      source: 'woocommerce',
      woocommerceCategory: product.categories?.[0]?.name ?? null,
    },
  };
}
