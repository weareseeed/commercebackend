import { describe, it, expect } from 'vitest';
import { mapBigCommerceProductToCanonical } from './mapper.js';
import { CatalogMappingError } from './types.js';
import { loadBigCommerceCatalogFixture } from './fixture-catalog.js';

describe('mapBigCommerceProductToCanonical', () => {
  it('maps a well-formed available BigCommerce product to a canonical catalog item', () => {
    const result = mapBigCommerceProductToCanonical({
      id: 1,
      name: 'Test Product',
      description: 'A test product',
      type: 'physical',
      price: 24.5,
      inventory_level: 7,
      availability: 'available',
      categories: ['Physical Good'],
    });

    expect(result).toEqual({
      externalId: '1',
      title: 'Test Product',
      description: 'A test product',
      type: 'physical_good',
      priceAmount: 2450,
      currency: 'USD',
      quantityAvailable: 7,
      attributes: { source: 'bigcommerce', bigcommerceCategory: 'Physical Good' },
    });
  });

  it('returns null for a disabled product', () => {
    const result = mapBigCommerceProductToCanonical({
      id: 2,
      name: 'Disabled Product',
      price: 10,
      availability: 'disabled',
    });
    expect(result).toBeNull();
  });

  it('imports a preorder product like an available one', () => {
    const result = mapBigCommerceProductToCanonical({
      id: 3,
      name: 'Preorder Product',
      price: 10,
      availability: 'preorder',
    });
    expect(result).not.toBeNull();
  });

  it('maps unmatched categories using the type field, defaulting to physical_good', () => {
    const physical = mapBigCommerceProductToCanonical({
      id: 4,
      name: 'Unknown Category Item',
      type: 'physical',
      price: 5,
    });
    expect(physical?.type).toBe('physical_good');
    expect(physical?.quantityAvailable).toBe(0);

    const digital = mapBigCommerceProductToCanonical({
      id: 5,
      name: 'Unknown Category Digital Item',
      type: 'digital',
      price: 5,
    });
    expect(digital?.type).toBe('digital_good');
  });

  it('throws CatalogMappingError when name is missing', () => {
    expect(() =>
      mapBigCommerceProductToCanonical({ id: 6, price: 10, availability: 'available' })
    ).toThrow(CatalogMappingError);
  });

  it('throws CatalogMappingError when there is no usable price', () => {
    expect(() =>
      mapBigCommerceProductToCanonical({ id: 7, name: 'No Price Item', availability: 'available' })
    ).toThrow(CatalogMappingError);
  });

  it('includes the failing externalId on the thrown error', () => {
    try {
      mapBigCommerceProductToCanonical({ id: 8, availability: 'available' });
      expect.unreachable('expected mapBigCommerceProductToCanonical to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CatalogMappingError);
      expect((err as InstanceType<typeof CatalogMappingError>).externalId).toBe('8');
    }
  });
});

describe('loadBigCommerceCatalogFixture', () => {
  it('loads a fixture whose products map to at least one valid and one failing item', () => {
    const products = loadBigCommerceCatalogFixture();
    expect(products.length).toBeGreaterThan(1);

    let mapped = 0;
    let failed = 0;
    for (const product of products) {
      try {
        const result = mapBigCommerceProductToCanonical(product);
        if (result) mapped += 1;
      } catch (err) {
        expect(err).toBeInstanceOf(CatalogMappingError);
        failed += 1;
      }
    }

    expect(mapped).toBeGreaterThan(0);
    expect(failed).toBeGreaterThan(0);
  });

  it('does not treat a disabled fixture product as a failure', () => {
    const products = loadBigCommerceCatalogFixture();
    const disabled = products.filter((p) => p.availability === 'disabled');
    expect(disabled.length).toBeGreaterThan(0);
    for (const product of disabled) {
      expect(mapBigCommerceProductToCanonical(product)).toBeNull();
    }
  });
});
