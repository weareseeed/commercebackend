-- Add controlled purchasing primitives for buyer agents.
CREATE TYPE "PurchasePolicyDecision" AS ENUM (
  'policy_approved',
  'human_approval_required',
  'no_policy'
);

ALTER TYPE "CheckoutIntentStatus" ADD VALUE IF NOT EXISTS 'human_approval_required';
ALTER TYPE "CheckoutIntentStatus" ADD VALUE IF NOT EXISTS 'human_approved';
ALTER TYPE "CheckoutIntentStatus" ADD VALUE IF NOT EXISTS 'human_rejected';

CREATE TABLE "PurchasePolicy" (
  "id" TEXT NOT NULL,
  "buyerAgentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "maxAutoApproveAmount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "allowedListingTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "allowedSellerAgentIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "requireHumanApprovalAboveAmount" INTEGER NOT NULL,
  "requireHumanApprovalForOffers" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PurchasePolicy_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CheckoutIntent"
  ADD COLUMN "successUrl" TEXT,
  ADD COLUMN "cancelUrl" TEXT,
  ADD COLUMN "purchasePolicyId" TEXT,
  ADD COLUMN "policyDecision" "PurchasePolicyDecision",
  ADD COLUMN "approvalRequestedAt" TIMESTAMP(3),
  ADD COLUMN "humanApprovedAt" TIMESTAMP(3),
  ADD COLUMN "humanRejectedAt" TIMESTAMP(3),
  ADD COLUMN "approvalRejectionReason" TEXT;

CREATE INDEX "PurchasePolicy_buyerAgentId_idx" ON "PurchasePolicy"("buyerAgentId");
CREATE INDEX "PurchasePolicy_enabled_idx" ON "PurchasePolicy"("enabled");
CREATE INDEX "CheckoutIntent_purchasePolicyId_idx" ON "CheckoutIntent"("purchasePolicyId");

ALTER TABLE "PurchasePolicy"
  ADD CONSTRAINT "PurchasePolicy_buyerAgentId_fkey"
  FOREIGN KEY ("buyerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CheckoutIntent"
  ADD CONSTRAINT "CheckoutIntent_purchasePolicyId_fkey"
  FOREIGN KEY ("purchasePolicyId") REFERENCES "PurchasePolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
