import { describe, it, expect } from 'vitest';
import { mapShopifyProductToCanonical } from './mapper.js';
import { CatalogMappingError } from './types.js';
import { loadShopifyCatalogFixture } from './fixture-catalog.js';

describe('mapShopifyProductToCanonical', () => {
  it('maps a well-formed active Shopify product to a canonical catalog item', () => {
    const result = mapShopifyProductToCanonical({
      id: 1,
      title: 'Test Product',
      body_html: '<p>A test product</p>',
      product_type: 'Physical Good',
      status: 'active',
      variants: [{ price: '10.00', inventory_quantity: 5 }],
    });

    expect(result).toEqual({
      externalId: '1',
      title: 'Test Product',
      description: '<p>A test product</p>',
      type: 'physical_good',
      priceAmount: 1000,
      currency: 'USD',
      quantityAvailable: 5,
      attributes: { source: 'shopify', shopifyProductType: 'Physical Good' },
    });
  });

  it('returns null for a draft product', () => {
    const result = mapShopifyProductToCanonical({
      id: 2,
      title: 'Draft Product',
      status: 'draft',
      variants: [{ price: '10.00', inventory_quantity: 5 }],
    });
    expect(result).toBeNull();
  });

  it('returns null for an archived product', () => {
    const result = mapShopifyProductToCanonical({
      id: 3,
      title: 'Archived Product',
      status: 'archived',
      variants: [{ price: '10.00', inventory_quantity: 5 }],
    });
    expect(result).toBeNull();
  });

  it('defaults unknown or missing product types to physical_good', () => {
    const result = mapShopifyProductToCanonical({
      id: 4,
      title: 'Unknown Category Item',
      status: 'active',
      variants: [{ price: '5.00' }],
    });
    expect(result?.type).toBe('physical_good');
    expect(result?.quantityAvailable).toBe(0);
  });

  it('maps known product types (case-insensitive) to their listing type', () => {
    const result = mapShopifyProductToCanonical({
      id: 5,
      title: 'Digital Item',
      product_type: 'digital good',
      status: 'active',
      variants: [{ price: '5.00' }],
    });
    expect(result?.type).toBe('digital_good');
  });

  it('throws CatalogMappingError when title is missing', () => {
    expect(() =>
      mapShopifyProductToCanonical({ id: 6, status: 'active', variants: [{ price: '5.00' }] })
    ).toThrow(CatalogMappingError);
  });

  it('throws CatalogMappingError when there is no usable variant price', () => {
    expect(() =>
      mapShopifyProductToCanonical({ id: 7, title: 'No Price Item', status: 'active', variants: [{}] })
    ).toThrow(CatalogMappingError);
  });

  it('throws CatalogMappingError when there are no variants at all', () => {
    expect(() =>
      mapShopifyProductToCanonical({ id: 8, title: 'No Variants Item', status: 'active' })
    ).toThrow(CatalogMappingError);
  });

  it('includes the failing externalId on the thrown error', () => {
    try {
      mapShopifyProductToCanonical({ id: 9, status: 'active', variants: [{ price: '5.00' }] });
      expect.unreachable('expected mapShopifyProductToCanonical to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CatalogMappingError);
      expect((err as InstanceType<typeof CatalogMappingError>).externalId).toBe('9');
    }
  });
});

describe('loadShopifyCatalogFixture', () => {
  it('loads a fixture with at least one valid, one failing, and one skipped (draft) item', () => {
    const products = loadShopifyCatalogFixture();
    expect(products.length).toBeGreaterThan(2);

    let mapped = 0;
    let failed = 0;
    let skipped = 0;
    for (const product of products) {
      try {
        const result = mapShopifyProductToCanonical(product);
        if (result === null) {
          skipped += 1;
        } else {
          mapped += 1;
        }
      } catch (err) {
        expect(err).toBeInstanceOf(CatalogMappingError);
        failed += 1;
      }
    }

    expect(mapped).toBeGreaterThan(0);
    expect(failed).toBeGreaterThan(0);
    expect(skipped).toBeGreaterThan(0);
  });
});
