import { describe, it, expect } from 'vitest';
import { mapWooCommerceProductToCanonical } from './mapper.js';
import { CatalogMappingError } from './types.js';
import { loadWooCommerceCatalogFixture } from './fixture-catalog.js';

describe('mapWooCommerceProductToCanonical', () => {
  it('maps a well-formed published WooCommerce product to a canonical catalog item', () => {
    const result = mapWooCommerceProductToCanonical({
      id: 1,
      name: 'Test Product',
      description: 'A test product',
      type: 'simple',
      status: 'publish',
      price: '24.50',
      stock_quantity: 7,
      stock_status: 'instock',
      virtual: false,
      categories: [{ id: 1, name: 'Physical Good' }],
    });

    expect(result).toEqual({
      externalId: '1',
      title: 'Test Product',
      description: 'A test product',
      type: 'physical_good',
      priceAmount: 2450,
      currency: 'USD',
      quantityAvailable: 7,
      attributes: { source: 'woocommerce', woocommerceCategory: 'Physical Good' },
    });
  });

  it('returns null for a draft product', () => {
    const result = mapWooCommerceProductToCanonical({
      id: 2,
      name: 'Draft Product',
      price: '10.00',
      status: 'draft',
    });
    expect(result).toBeNull();
  });

  it('returns null for a pending or private product', () => {
    expect(
      mapWooCommerceProductToCanonical({ id: 3, name: 'Pending', price: '10', status: 'pending' })
    ).toBeNull();
    expect(
      mapWooCommerceProductToCanonical({ id: 4, name: 'Private', price: '10', status: 'private' })
    ).toBeNull();
  });

  it('imports an onbackorder product like an in-stock one', () => {
    const result = mapWooCommerceProductToCanonical({
      id: 5,
      name: 'Backorder Product',
      price: '10.00',
      status: 'publish',
      stock_status: 'onbackorder',
    });
    expect(result).not.toBeNull();
  });

  it('maps unmatched categories using the virtual flag, defaulting to physical_good', () => {
    const physical = mapWooCommerceProductToCanonical({
      id: 6,
      name: 'Unknown Category Item',
      price: '5.00',
      status: 'publish',
      virtual: false,
    });
    expect(physical?.type).toBe('physical_good');
    expect(physical?.quantityAvailable).toBe(0);

    const digital = mapWooCommerceProductToCanonical({
      id: 7,
      name: 'Unknown Category Digital Item',
      price: '5.00',
      status: 'publish',
      virtual: true,
    });
    expect(digital?.type).toBe('digital_good');
  });

  it('throws CatalogMappingError when name is missing', () => {
    expect(() =>
      mapWooCommerceProductToCanonical({ id: 8, price: '10.00', status: 'publish' })
    ).toThrow(CatalogMappingError);
  });

  it('throws CatalogMappingError when there is no usable price', () => {
    expect(() =>
      mapWooCommerceProductToCanonical({ id: 9, name: 'No Price Item', status: 'publish' })
    ).toThrow(CatalogMappingError);
  });

  it('includes the failing externalId on the thrown error', () => {
    try {
      mapWooCommerceProductToCanonical({ id: 10, status: 'publish' });
      expect.unreachable('expected mapWooCommerceProductToCanonical to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CatalogMappingError);
      expect((err as InstanceType<typeof CatalogMappingError>).externalId).toBe('10');
    }
  });
});

describe('loadWooCommerceCatalogFixture', () => {
  it('loads a fixture whose products map to at least one valid and one failing item', () => {
    const products = loadWooCommerceCatalogFixture();
    expect(products.length).toBeGreaterThan(1);

    let mapped = 0;
    let failed = 0;
    for (const product of products) {
      try {
        const result = mapWooCommerceProductToCanonical(product);
        if (result) mapped += 1;
      } catch (err) {
        expect(err).toBeInstanceOf(CatalogMappingError);
        failed += 1;
      }
    }

    expect(mapped).toBeGreaterThan(0);
    expect(failed).toBeGreaterThan(0);
  });

  it('does not treat a draft fixture product as a failure', () => {
    const products = loadWooCommerceCatalogFixture();
    const drafts = products.filter((p) => p.status === 'draft');
    expect(drafts.length).toBeGreaterThan(0);
    for (const product of drafts) {
      expect(mapWooCommerceProductToCanonical(product)).toBeNull();
    }
  });
});
