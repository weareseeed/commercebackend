-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('buyer', 'seller', 'both');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('physical_good', 'digital_good', 'event_ticket', 'service', 'other');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('active', 'paused', 'sold_out', 'deleted');

-- CreateEnum
CREATE TYPE "CheckoutIntentStatus" AS ENUM ('open', 'paid', 'expired', 'cancelled', 'failed', 'payment_inventory_conflict');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('paid', 'refunded', 'failed');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('pending', 'processing', 'fulfilled', 'cancelled');

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AgentType" NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "sellerAgentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ListingType" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'active',
    "priceAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "quantityAvailable" INTEGER NOT NULL,
    "attributes" JSONB NOT NULL,
    "fulfillmentInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutIntent" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerAgentId" TEXT NOT NULL,
    "sellerAgentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amountSubtotal" INTEGER NOT NULL,
    "amountTotal" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "CheckoutIntentStatus" NOT NULL DEFAULT 'open',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "checkoutUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutIntent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "checkoutIntentId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerAgentId" TEXT NOT NULL,
    "sellerAgentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amountTotal" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'paid',
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'pending',
    "fulfillmentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentQueryLog" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentQueryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_apiKeyHash_key" ON "Agent"("apiKeyHash");

-- CreateIndex
CREATE INDEX "Listing_sellerAgentId_idx" ON "Listing"("sellerAgentId");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutIntent_stripeCheckoutSessionId_key" ON "CheckoutIntent"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "CheckoutIntent_stripeCheckoutSessionId_idx" ON "CheckoutIntent"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "CheckoutIntent_buyerAgentId_idx" ON "CheckoutIntent"("buyerAgentId");

-- CreateIndex
CREATE INDEX "CheckoutIntent_sellerAgentId_idx" ON "CheckoutIntent"("sellerAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutIntentId_key" ON "Order"("checkoutIntentId");

-- CreateIndex
CREATE INDEX "Order_buyerAgentId_idx" ON "Order"("buyerAgentId");

-- CreateIndex
CREATE INDEX "Order_sellerAgentId_idx" ON "Order"("sellerAgentId");

-- CreateIndex
CREATE INDEX "AgentQueryLog_agentId_idx" ON "AgentQueryLog"("agentId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerAgentId_fkey" FOREIGN KEY ("sellerAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutIntent" ADD CONSTRAINT "CheckoutIntent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutIntent" ADD CONSTRAINT "CheckoutIntent_buyerAgentId_fkey" FOREIGN KEY ("buyerAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutIntent" ADD CONSTRAINT "CheckoutIntent_sellerAgentId_fkey" FOREIGN KEY ("sellerAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_checkoutIntentId_fkey" FOREIGN KEY ("checkoutIntentId") REFERENCES "CheckoutIntent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerAgentId_fkey" FOREIGN KEY ("buyerAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerAgentId_fkey" FOREIGN KEY ("sellerAgentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentQueryLog" ADD CONSTRAINT "AgentQueryLog_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Custom PostgreSQL CHECK constraints
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_priceAmount_nonnegative" CHECK ("priceAmount" >= 0);
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_quantityAvailable_nonnegative" CHECK ("quantityAvailable" >= 0);

ALTER TABLE "CheckoutIntent" ADD CONSTRAINT "CheckoutIntent_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "CheckoutIntent" ADD CONSTRAINT "CheckoutIntent_amountTotal_nonnegative" CHECK ("amountTotal" >= 0);

ALTER TABLE "Order" ADD CONSTRAINT "Order_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_amountTotal_nonnegative" CHECK ("amountTotal" >= 0);
