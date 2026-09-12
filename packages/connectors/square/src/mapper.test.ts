import { describe, it, expect } from 'vitest';
import { mapSquareCatalogObjectToCanonical } from './mapper.js';
import { CatalogMappingError } from './types.js';
import { loadSquareCatalogFixture } from './fixture-catalog.js';

describe('mapSquareCatalogObjectToCanonical', () => {
  it('maps a well-formed Square ITEM to a canonical catalog item', () => {
    const result = mapSquareCatalogObjectToCanonical({
      type: 'ITEM',
      id: 'SQ_1',
      item_data: {
        name: 'Test Item',
        description: 'A test item',
        category: 'physical_good',
        variations: [{ item_variation_data: { price_money: { amount: 1000, currency: 'USD' }, inventory_count: 5 } }],
      },
    });

    expect(result).toEqual({
      externalId: 'SQ_1',
      title: 'Test Item',
      description: 'A test item',
      type: 'physical_good',
      priceAmount: 1000,
      currency: 'USD',
      quantityAvailable: 5,
      attributes: { source: 'square', squareCategory: 'physical_good' },
    });
  });

  it('returns null for a non-ITEM catalog object (e.g. a category)', () => {
    const result = mapSquareCatalogObjectToCanonical({ type: 'CATEGORY', id: 'SQ_CAT' });
    expect(result).toBeNull();
  });

  it('defaults unknown categories to physical_good', () => {
    const result = mapSquareCatalogObjectToCanonical({
      type: 'ITEM',
      id: 'SQ_2',
      item_data: {
        name: 'Unknown Category Item',
        variations: [{ item_variation_data: { price_money: { amount: 500, currency: 'USD' } } }],
      },
    });
    expect(result?.type).toBe('physical_good');
    expect(result?.quantityAvailable).toBe(0);
  });

  it('throws CatalogMappingError when item_data.name is missing', () => {
    expect(() => mapSquareCatalogObjectToCanonical({ type: 'ITEM', id: 'SQ_3', item_data: {} })).toThrow(
      CatalogMappingError
    );
  });

  it('throws CatalogMappingError when there is no usable price', () => {
    expect(() =>
      mapSquareCatalogObjectToCanonical({
        type: 'ITEM',
        id: 'SQ_4',
        item_data: { name: 'No Price Item', variations: [{ item_variation_data: {} }] },
      })
    ).toThrow(CatalogMappingError);
  });

  it('includes the failing externalId on the thrown error', () => {
    try {
      mapSquareCatalogObjectToCanonical({ type: 'ITEM', id: 'SQ_5', item_data: {} });
      expect.unreachable('expected mapSquareCatalogObjectToCanonical to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(CatalogMappingError);
      expect((err as InstanceType<typeof CatalogMappingError>).externalId).toBe('SQ_5');
    }
  });
});

describe('loadSquareCatalogFixture', () => {
  it('loads a fixture whose ITEM objects map to at least one valid and one failing item', () => {
    const objects = loadSquareCatalogFixture();
    const items = objects.filter((o) => o.type === 'ITEM');
    expect(items.length).toBeGreaterThan(1);

    let mapped = 0;
    let failed = 0;
    for (const object of items) {
      try {
        const result = mapSquareCatalogObjectToCanonical(object);
        if (result) mapped += 1;
      } catch (err) {
        expect(err).toBeInstanceOf(CatalogMappingError);
        failed += 1;
      }
    }

    expect(mapped).toBeGreaterThan(0);
    expect(failed).toBeGreaterThan(0);
  });

  it('does not treat non-ITEM fixture objects (e.g. categories) as failures', () => {
    const objects = loadSquareCatalogFixture();
    const nonItems = objects.filter((o) => o.type !== 'ITEM');
    expect(nonItems.length).toBeGreaterThan(0);
    for (const object of nonItems) {
      expect(mapSquareCatalogObjectToCanonical(object)).toBeNull();
    }
  });
});
