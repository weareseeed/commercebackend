-- Weekly backlog item 9: Square connector spike (read-only), building the
-- canonical imported-catalog model item 8 was meant to provide.
--
-- Both new Listing columns are nullable: existing, natively-created listings
-- get NULL/NULL and are unaffected. A connector-imported listing's
-- (importSource, externalId) pair is unique so re-running a sync updates the
-- same row instead of creating a duplicate; Postgres treats NULL/NULL rows as
-- distinct from each other, so this never constrains native listings.
ALTER TABLE "Listing" ADD COLUMN "importSource" TEXT;
ALTER TABLE "Listing" ADD COLUMN "externalId" TEXT;

CREATE UNIQUE INDEX "Listing_importSource_externalId_key" ON "Listing"("importSource", "externalId");

CREATE TABLE "CatalogSyncLog" (
    "id" TEXT NOT NULL,
    "connector" TEXT NOT NULL,
    "sellerAgentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "itemsImported" INTEGER NOT NULL,
    "itemsFailed" INTEGER NOT NULL,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogSyncLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CatalogSyncLog_connector_idx" ON "CatalogSyncLog"("connector");

CREATE INDEX "CatalogSyncLog_sellerAgentId_idx" ON "CatalogSyncLog"("sellerAgentId");
