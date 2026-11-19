/**
 * Canonical imported-catalog model (weekly backlog item 8: "connector
 * abstraction + Shopify import spike"). This is the same shared shape
 * `packages/connectors/square` maps its catalog into — see that package's
 * `types.ts` for the shape's origin. It is duplicated here rather than
 * imported from `@commercebackend/connector-square` so neither connector
 * depends on the other; a future connector-neutral core package could
 * extract this shape once a third connector needs it too.
 */

/** A single item from an external catalog, already mapped to CommerceBackend's
 * listing shape. Not yet persisted. */
export interface CanonicalCatalogItem {
  /** Stable id from the source system. Combined with `source`, uniquely
   * identifies this item across repeated syncs so re-importing updates the
   * same listing instead of creating a duplicate. */
  externalId: string;
  title: string;
  description: string;
  /** Matches CommerceBackend's `ListingType` enum. Connectors map their own
   * category vocabulary onto this closed set. */
  type: 'physical_good' | 'digital_good' | 'service' | 'event_ticket';
  priceAmount: number;
  currency: string;
  quantityAvailable: number;
  // `any` (not `unknown`) matches the convention used for the equivalent
  // native-listing field (`z.record(z.any())` in @commercebackend/schemas) so
  // this is directly assignable to Prisma's `Json` column type.
  attributes: Record<string, any>;
}

/** One item that failed to map or persist during a sync. The batch continues;
 * this failure is recorded, not thrown. */
export interface ConnectorImportError {
  externalId: string | null;
  message: string;
}

export interface ConnectorSyncSummary {
  connector: string;
  itemsImported: number;
  itemsFailed: number;
  errors: ConnectorImportError[];
}

/** Raised when a single source-catalog item cannot be mapped to
 * `CanonicalCatalogItem`. Callers catch this per-item and record it in
 * `ConnectorSyncSummary.errors` rather than aborting the whole sync. */
export class CatalogMappingError extends Error {
  constructor(
    public readonly externalId: string | null,
    message: string
  ) {
    super(message);
    this.name = 'CatalogMappingError';
  }
}
