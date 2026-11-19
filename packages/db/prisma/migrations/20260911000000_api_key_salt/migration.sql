-- Weekly backlog item 5: per-record salt for API-key hashing.
--
-- New columns are nullable so existing agents (whose `apiKeyHash` was
-- computed with the old shared static salt) need no backfill and keep
-- authenticating exactly as before. Only agents created after this
-- migration get a per-record `apiKeySalt` plus a public `apiKeyId` used to
-- look up the row before verifying the salted hash. See
-- packages/db/src/auth-utils.ts and apps/api/src/plugins/auth.ts.
ALTER TABLE "Agent" ADD COLUMN "apiKeySalt" TEXT;
ALTER TABLE "Agent" ADD COLUMN "apiKeyId" TEXT;

CREATE UNIQUE INDEX "Agent_apiKeyId_key" ON "Agent"("apiKeyId");
