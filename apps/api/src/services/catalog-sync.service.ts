import { prisma, Prisma } from '@commercebackend/db';
import {
  CatalogMappingError,
  ConnectorImportError,
  loadSquareCatalog,
  mapSquareCatalogObjectToCanonical,
} from '@commercebackend/connector-square';
import {
  CatalogMappingError as ShopifyCatalogMappingError,
  loadShopifyCatalog,
  mapShopifyProductToCanonical,
} from '@commercebackend/connector-shopify';
import { AppError } from '../plugins/error-handler';

const SQUARE_CONNECTOR = 'square';
const SHOPIFY_CONNECTOR = 'shopify';

export class CatalogSyncService {
  /**
   * Catalog import (weekly backlog item 9, later extended with an optional
   * live mode): by default reads a static Square catalog fixture (no live
   * Square API call). Configuring a real `SQUARE_ACCESS_TOKEN` switches this
   * to fetch from the actual Square Catalog API (sandbox by default; see
   * `@commercebackend/connector-square`'s `loadSquareCatalog`). Either way,
   * each item is mapped to the canonical catalog shape and upserted into
   * `Listing` keyed on (importSource, externalId) so re-running the sync
   * updates existing imported listings instead of duplicating them. A
   * per-item mapping failure is recorded in the returned sync log, not
   * thrown — the rest of the batch still imports. A failure to reach the
   * catalog source at all (e.g. live API auth/network failure) is recorded
   * as a single `failed` sync log entry rather than throwing.
   */
  static async syncSquareCatalog(sellerAgentId: string) {
    const sellerAgent = await prisma.agent.findUnique({ where: { id: sellerAgentId } });
    if (!sellerAgent) {
      throw new AppError('AGENT_NOT_FOUND', 'Seller agent not found', 404);
    }
    if (sellerAgent.type !== 'seller' && sellerAgent.type !== 'both') {
      throw new AppError('VALIDATION_ERROR', 'sellerAgentId must belong to a seller or both-type agent', 400);
    }

    let catalogObjects;
    try {
      catalogObjects = await loadSquareCatalog();
    } catch (err) {
      return prisma.catalogSyncLog.create({
        data: {
          connector: SQUARE_CONNECTOR,
          sellerAgentId,
          status: 'failed',
          itemsImported: 0,
          itemsFailed: 1,
          errors: [
            { externalId: null, message: err instanceof Error ? err.message : 'Failed to reach Square catalog source' },
          ] as unknown as Prisma.InputJsonValue,
        },
      });
    }

    const errors: ConnectorImportError[] = [];
    let itemsImported = 0;

    for (const object of catalogObjects) {
      let canonicalItem;
      try {
        canonicalItem = mapSquareCatalogObjectToCanonical(object);
      } catch (err) {
        if (err instanceof CatalogMappingError) {
          errors.push({ externalId: err.externalId, message: err.message });
          continue;
        }
        throw err;
      }

      // Non-ITEM catalog objects (categories, taxes, etc.) are not listings.
      if (!canonicalItem) continue;

      const existing = await prisma.listing.findFirst({
        where: { importSource: SQUARE_CONNECTOR, externalId: canonicalItem.externalId },
      });

      if (existing) {
        await prisma.listing.update({
          where: { id: existing.id },
          data: {
            title: canonicalItem.title,
            description: canonicalItem.description,
            type: canonicalItem.type,
            priceAmount: canonicalItem.priceAmount,
            currency: canonicalItem.currency,
            quantityAvailable: canonicalItem.quantityAvailable,
            status: canonicalItem.quantityAvailable > 0 ? 'active' : 'sold_out',
            attributes: canonicalItem.attributes,
          },
        });
      } else {
        await prisma.listing.create({
          data: {
            sellerAgentId,
            title: canonicalItem.title,
            description: canonicalItem.description,
            type: canonicalItem.type,
            status: canonicalItem.quantityAvailable > 0 ? 'active' : 'sold_out',
            priceAmount: canonicalItem.priceAmount,
            currency: canonicalItem.currency,
            quantityAvailable: canonicalItem.quantityAvailable,
            attributes: canonicalItem.attributes,
            importSource: SQUARE_CONNECTOR,
            externalId: canonicalItem.externalId,
          },
        });
      }

      itemsImported += 1;
    }

    const status = errors.length === 0 ? 'success' : itemsImported > 0 ? 'partial' : 'failed';

    return prisma.catalogSyncLog.create({
      data: {
        connector: SQUARE_CONNECTOR,
        sellerAgentId,
        status,
        itemsImported,
        itemsFailed: errors.length,
        errors: errors.length > 0 ? (errors as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  /**
   * Catalog import (weekly backlog item 8, later extended with an optional
   * live mode): by default reads a static Shopify catalog fixture (no live
   * Shopify API call). Configuring `SHOPIFY_SHOP_DOMAIN` and
   * `SHOPIFY_ACCESS_TOKEN` switches this to fetch from the actual Shopify
   * Admin API instead (see `@commercebackend/connector-shopify`'s
   * `loadShopifyCatalog`). Either way, each product is mapped to the
   * canonical catalog shape and upserted into `Listing` keyed on
   * (importSource, externalId) so re-running the sync updates existing
   * imported listings instead of duplicating them. A per-item mapping
   * failure is recorded in the returned sync log, not thrown — the rest of
   * the batch still imports. A failure to reach the catalog source at all
   * (e.g. live API auth/network failure) is recorded as a single `failed`
   * sync log entry rather than throwing. Mirrors `syncSquareCatalog` above;
   * see `packages/connectors/shopify` for the mapping logic.
   */
  static async syncShopifyCatalog(sellerAgentId: string) {
    const sellerAgent = await prisma.agent.findUnique({ where: { id: sellerAgentId } });
    if (!sellerAgent) {
      throw new AppError('AGENT_NOT_FOUND', 'Seller agent not found', 404);
    }
    if (sellerAgent.type !== 'seller' && sellerAgent.type !== 'both') {
      throw new AppError('VALIDATION_ERROR', 'sellerAgentId must belong to a seller or both-type agent', 400);
    }

    let products;
    try {
      products = await loadShopifyCatalog();
    } catch (err) {
      return prisma.catalogSyncLog.create({
        data: {
          connector: SHOPIFY_CONNECTOR,
          sellerAgentId,
          status: 'failed',
          itemsImported: 0,
          itemsFailed: 1,
          errors: [
            { externalId: null, message: err instanceof Error ? err.message : 'Failed to reach Shopify catalog source' },
          ] as unknown as Prisma.InputJsonValue,
        },
      });
    }

    const errors: ConnectorImportError[] = [];
    let itemsImported = 0;

    for (const product of products) {
      let canonicalItem;
      try {
        canonicalItem = mapShopifyProductToCanonical(product);
      } catch (err) {
        if (err instanceof ShopifyCatalogMappingError) {
          errors.push({ externalId: err.externalId, message: err.message });
          continue;
        }
        throw err;
      }

      // Draft/archived Shopify products are not agent-shoppable listings.
      if (!canonicalItem) continue;

      const existing = await prisma.listing.findFirst({
        where: { importSource: SHOPIFY_CONNECTOR, externalId: canonicalItem.externalId },
      });

      if (existing) {
        await prisma.listing.update({
          where: { id: existing.id },
          data: {
            title: canonicalItem.title,
            description: canonicalItem.description,
            type: canonicalItem.type,
            priceAmount: canonicalItem.priceAmount,
            currency: canonicalItem.currency,
            quantityAvailable: canonicalItem.quantityAvailable,
            status: canonicalItem.quantityAvailable > 0 ? 'active' : 'sold_out',
            attributes: canonicalItem.attributes,
          },
        });
      } else {
        await prisma.listing.create({
          data: {
            sellerAgentId,
            title: canonicalItem.title,
            description: canonicalItem.description,
            type: canonicalItem.type,
            status: canonicalItem.quantityAvailable > 0 ? 'active' : 'sold_out',
            priceAmount: canonicalItem.priceAmount,
            currency: canonicalItem.currency,
            quantityAvailable: canonicalItem.quantityAvailable,
            attributes: canonicalItem.attributes,
            importSource: SHOPIFY_CONNECTOR,
            externalId: canonicalItem.externalId,
          },
        });
      }

      itemsImported += 1;
    }

    const status = errors.length === 0 ? 'success' : itemsImported > 0 ? 'partial' : 'failed';

    return prisma.catalogSyncLog.create({
      data: {
        connector: SHOPIFY_CONNECTOR,
        sellerAgentId,
        status,
        itemsImported,
        itemsFailed: errors.length,
        errors: errors.length > 0 ? (errors as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  static async listSyncLogs(limit = 20, offset = 0) {
    return prisma.catalogSyncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}
