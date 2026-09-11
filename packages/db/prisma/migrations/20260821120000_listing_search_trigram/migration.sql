-- Move listing search from an in-memory scan to DB-level trigram matching.
-- pg_trgm backs ILIKE substring lookups with a GIN index instead of a full scan.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Listing_title_trgm_idx" ON "Listing" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Listing_description_trgm_idx" ON "Listing" USING GIN ("description" gin_trgm_ops);
