-- Weekly backlog item 14: purchase-policy & budget primitive (read-only
-- enforcement scaffold). Adds an optional trailing-period spending budget to
-- PurchasePolicy, and a read-only, non-blocking signal on CheckoutIntent
-- reporting whether a given checkout would exceed that budget.
--
-- Both new PurchasePolicy columns are nullable: existing policies get
-- NULL/NULL (no spending limit configured, same behavior as today).
ALTER TABLE "PurchasePolicy" ADD COLUMN "spendingLimitAmount" INTEGER;
ALTER TABLE "PurchasePolicy" ADD COLUMN "spendingLimitPeriodDays" INTEGER;

ALTER TABLE "CheckoutIntent" ADD COLUMN "spendingLimitSignal" JSONB;
