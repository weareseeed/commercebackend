import { CanonicalCatalogItem, CatalogMappingError } from './types.js';

/**
 * Minimal shape of a Shopify Admin API `Product` this mapper reads (as
 * returned by `GET /admin/api/2024-01/products.json`). Not the full Shopify
 * SDK type — only the fields this read-only spike needs. See
 * https://shopify.dev/docs/api/admin-rest/latest/resources/product.
 */
export interface ShopifyProductLike {
  id: number | string;
  title?: string;
  body_html?: string;
  product_type?: string;
  status?: string;
  variants?: Array<{
    price?: string;
    inventory_quantity?: number;
  }>;
}

const SHOPIFY_PRODUCT_TYPE_TO_LISTING_TYPE: Record<string, CanonicalCatalogItem['type']> = {
  'physical good': 'physical_good',
  'digital good': 'digital_good',
  service: 'service',
  'event ticket': 'event_ticket',
};

/**
 * Maps one Shopify `Product` to CommerceBackend's canonical catalog item
 * shape. Draft/archived products are not agent-shoppable listings — callers
 * should skip them, not treat them as a mapping failure. Returns `null` for
 * that case; throws `CatalogMappingError` for an active product missing data
 * this shape requires (a title or a usable variant price).
 */
export function mapShopifyProductToCanonical(product: ShopifyProductLike): CanonicalCatalogItem | null {
  if (product.status === 'draft' || product.status === 'archived') {
    return null;
  }

  if (!product.title) {
    throw new CatalogMappingError(product.id != null ? String(product.id) : null, 'Shopify product is missing a title.');
  }

  const variant = product.variants?.[0];
  const priceAmount = variant?.price !== undefined ? Math.round(parseFloat(variant.price) * 100) : NaN;
  if (!variant || variant.price === undefined || Number.isNaN(priceAmount)) {
    throw new CatalogMappingError(String(product.id), 'Shopify product has no usable variants[0].price.');
  }

  const listingType =
    SHOPIFY_PRODUCT_TYPE_TO_LISTING_TYPE[(product.product_type ?? '').trim().toLowerCase()] ?? 'physical_good';

  return {
    externalId: String(product.id),
    title: product.title,
    description: product.body_html ?? '',
    type: listingType,
    priceAmount,
    // Shopify's product/variant payload does not carry a currency field
    // (it's a store-level setting fetched separately); this read-only spike
    // fixes it to USD, matching the sandbox's other listings.
    currency: 'USD',
    quantityAvailable: variant.inventory_quantity ?? 0,
    attributes: {
      source: 'shopify',
      shopifyProductType: product.product_type ?? null,
    },
  };
}
