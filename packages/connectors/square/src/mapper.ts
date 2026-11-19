import { CanonicalCatalogItem, CatalogMappingError } from './types.js';

/**
 * Minimal shape of a Square Catalog API `CatalogObject` this mapper reads.
 * Not the full Square SDK type — only the fields this read-only spike needs.
 * See https://developer.squareup.com/reference/square/objects/CatalogObject.
 */
export interface SquareCatalogObjectLike {
  type: string;
  id: string;
  item_data?: {
    name?: string;
    description?: string;
    category?: string;
    variations?: Array<{
      item_variation_data?: {
        price_money?: { amount?: number; currency?: string };
        inventory_count?: number;
      };
    }>;
  };
}

const SQUARE_CATEGORY_TO_LISTING_TYPE: Record<string, CanonicalCatalogItem['type']> = {
  physical_good: 'physical_good',
  digital_good: 'digital_good',
  service: 'service',
  event_ticket: 'event_ticket',
};

/**
 * Maps one Square `CatalogObject` to CommerceBackend's canonical catalog
 * item shape. Non-`ITEM` objects (categories, taxes, discounts, etc.) are not
 * listings — callers should skip them, not treat them as a mapping failure.
 * Returns `null` for that case; throws `CatalogMappingError` for an `ITEM`
 * that's missing data this shape requires (e.g. no price).
 */
export function mapSquareCatalogObjectToCanonical(
  object: SquareCatalogObjectLike
): CanonicalCatalogItem | null {
  if (object.type !== 'ITEM') {
    return null;
  }

  const item = object.item_data;
  if (!item || !item.name) {
    throw new CatalogMappingError(object.id, 'Square item is missing item_data.name.');
  }

  const variation = item.variations?.[0]?.item_variation_data;
  const priceMoney = variation?.price_money;
  if (!priceMoney || typeof priceMoney.amount !== 'number' || !priceMoney.currency) {
    throw new CatalogMappingError(
      object.id,
      'Square item has no usable variation[0].item_variation_data.price_money.'
    );
  }

  const listingType = SQUARE_CATEGORY_TO_LISTING_TYPE[item.category ?? ''] ?? 'physical_good';

  return {
    externalId: object.id,
    title: item.name,
    description: item.description ?? '',
    type: listingType,
    priceAmount: priceMoney.amount,
    currency: priceMoney.currency,
    quantityAvailable: variation?.inventory_count ?? 0,
    attributes: {
      source: 'square',
      squareCategory: item.category ?? null,
    },
  };
}
