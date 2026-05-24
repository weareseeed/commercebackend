-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('pending', 'accepted', 'checkout_pending', 'rejected', 'countered', 'expired', 'cancelled');

-- AlterTable
ALTER TABLE "CheckoutIntent" ADD COLUMN "offerId" TEXT;

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerAgentId" TEXT NOT NULL,
    "priceAmount" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "counterPriceAmount" INTEGER,
    "counterQuantity" INTEGER,
    "counterExpiresAt" TIMESTAMP(3),
    "acceptedPriceAmount" INTEGER,
    "acceptedQuantity" INTEGER,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferHistory" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "fromStatus" "OfferStatus",
    "toStatus" "OfferStatus" NOT NULL,
    "event" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckoutIntent_offerId_idx" ON "CheckoutIntent"("offerId");

-- CreateIndex
CREATE INDEX "Offer_listingId_idx" ON "Offer"("listingId");

-- CreateIndex
CREATE INDEX "Offer_buyerAgentId_idx" ON "Offer"("buyerAgentId");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE INDEX "OfferHistory_offerId_idx" ON "OfferHistory"("offerId");

-- AddForeignKey
ALTER TABLE "CheckoutIntent" ADD CONSTRAINT "CheckoutIntent_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferHistory" ADD CONSTRAINT "OfferHistory_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Custom PostgreSQL CHECK constraints for Offer
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_priceAmount_positive" CHECK ("priceAmount" > 0);
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_counterPriceAmount_positive" CHECK ("counterPriceAmount" IS NULL OR "counterPriceAmount" > 0);
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_counterQuantity_positive" CHECK ("counterQuantity" IS NULL OR "counterQuantity" > 0);
