-- Persist critical operational events (e.g. CHECKOUT_PERSISTENCE_FAILED) that
-- today are only structured console logs, so the operator metrics endpoint
-- can report live counts instead of requiring log-scraping.
CREATE TABLE "CriticalEvent" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CriticalEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CriticalEvent_code_idx" ON "CriticalEvent"("code");

CREATE INDEX "CriticalEvent_createdAt_idx" ON "CriticalEvent"("createdAt");
