import { prisma } from '@commercebackend/db';
import { CreateOfferInput, CreateCounterOfferInput } from '@commercebackend/schemas';
import { AppError } from '../plugins/error-handler';

export class OffersService {
  private static MAX_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  private static validateExpiration(dateStr: string, maxWindowMs: number) {
    const expiresAt = new Date(dateStr);
    const now = new Date();
    if (isNaN(expiresAt.getTime())) {
      throw new AppError('VALIDATION_ERROR', 'Invalid expiration date format', 400);
    }
    if (expiresAt <= now) {
      throw new AppError('VALIDATION_ERROR', 'Expiration date must be in the future', 400);
    }
    if (expiresAt.getTime() - now.getTime() > maxWindowMs) {
      throw new AppError('VALIDATION_ERROR', 'Expiration date cannot exceed 7 days from now', 400);
    }
    return expiresAt;
  }

  private static async checkAndEnforceExpirationTx(tx: any, offerId: string, offer: any) {
    const now = new Date();
    const isExpired = 
      (offer.status === 'pending' && offer.expiresAt < now) ||
      (offer.status === 'countered' && offer.counterExpiresAt < now);

    if (isExpired) {
      // Transition to expired status transactionally
      await tx.offer.update({
        where: { id: offerId },
        data: { status: 'expired' },
      });

      await tx.offerHistory.create({
        data: {
          offerId,
          fromStatus: offer.status,
          toStatus: 'expired',
          event: 'OFFER_EXPIRED',
          actorId: 'system',
          note: 'Offer automatically marked as expired during access.',
          metadata: { checkedAt: now.toISOString() },
        },
      });

      throw new AppError('OFFER_EXPIRED', 'This offer has expired', 400);
    }
  }

  static async createOffer(buyerAgentId: string, listingId: string, input: CreateOfferInput) {
    if (input.priceAmount <= 0) {
      throw new AppError('VALIDATION_ERROR', 'Price amount must be greater than zero', 400);
    }
    if (input.quantity <= 0) {
      throw new AppError('VALIDATION_ERROR', 'Quantity must be greater than zero', 400);
    }
    if (input.note && input.note.length > 500) {
      throw new AppError('VALIDATION_ERROR', 'Note cannot exceed 500 characters', 400);
    }

    const expiresAt = this.validateExpiration(input.expiresAt, this.MAX_EXPIRATION_MS);

    // Retrieve listing inside transaction
    return await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id: listingId },
      });

      if (!listing || listing.status === 'deleted') {
        throw new AppError('LISTING_NOT_FOUND', 'Listing not found', 404);
      }
      if (listing.status !== 'active') {
        throw new AppError('LISTING_NOT_ACTIVE', 'Listing is not active', 400);
      }
      if (listing.sellerAgentId === buyerAgentId) {
        throw new AppError('SELF_OFFER_NOT_ALLOWED', 'Buyer agent cannot make an offer on their own listing', 403);
      }

      const offer = await tx.offer.create({
        data: {
          listingId,
          buyerAgentId,
          priceAmount: input.priceAmount,
          quantity: input.quantity,
          status: 'pending',
          expiresAt,
        },
      });

      await tx.offerHistory.create({
        data: {
          offerId: offer.id,
          fromStatus: null,
          toStatus: 'pending',
          event: 'OFFER_CREATED',
          actorId: buyerAgentId,
          note: input.note || null,
          metadata: {
            priceAmount: input.priceAmount,
            quantity: input.quantity,
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      return offer;
    });
  }

  static async getOffers(agentId: string, role: 'buyer' | 'seller', status?: string) {
    const whereClause: any = {};
    if (role === 'buyer') {
      whereClause.buyerAgentId = agentId;
    } else {
      whereClause.listing = { sellerAgentId: agentId };
    }

    if (status) {
      whereClause.status = status;
    }

    return await prisma.offer.findMany({
      where: whereClause,
      include: {
        listing: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getOfferById(id: string, agentId: string) {
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        listing: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!offer) {
      throw new AppError('OFFER_NOT_FOUND', 'Offer not found', 404);
    }

    if (offer.buyerAgentId !== agentId && offer.listing.sellerAgentId !== agentId) {
      throw new AppError('FORBIDDEN', 'You do not have access to this offer', 403);
    }

    return offer;
  }

  static async acceptOffer(id: string, sellerAgentId: string) {
    return await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id },
        include: { listing: true },
      });

      if (!offer) {
        throw new AppError('OFFER_NOT_FOUND', 'Offer not found', 404);
      }

      // Auth validation
      if (offer.listing.sellerAgentId !== sellerAgentId) {
        throw new AppError('FORBIDDEN', 'You are not the seller for this listing', 403);
      }

      if (offer.status === 'accepted') {
        return offer;
      }

      // Expiration check
      await this.checkAndEnforceExpirationTx(tx, id, offer);

      if (offer.status !== 'pending') {
        throw new AppError('INVALID_OFFER_STATUS', `Cannot accept offer with status ${offer.status}`, 400);
      }

      // Lock listing for update to check inventory safely
      const listing = await tx.$queryRawUnsafe<any[]>(
        'SELECT * FROM "Listing" WHERE id = $1 FOR UPDATE',
        offer.listingId
      );
      const activeListing = listing[0];
      if (!activeListing || activeListing.status !== 'active') {
        throw new AppError('LISTING_NOT_ACTIVE', 'Listing is not active', 400);
      }
      if (activeListing.quantityAvailable < offer.quantity) {
        throw new AppError('INSUFFICIENT_INVENTORY', 'Insufficient inventory to accept this offer', 400);
      }

      const updatedOffer = await tx.offer.update({
        where: { id },
        data: {
          status: 'accepted',
          acceptedPriceAmount: offer.priceAmount,
          acceptedQuantity: offer.quantity,
          acceptedAt: new Date(),
          acceptedByAgentId: sellerAgentId,
        },
      });

      await tx.offerHistory.create({
        data: {
          offerId: id,
          fromStatus: 'pending',
          toStatus: 'accepted',
          event: 'OFFER_ACCEPTED',
          actorId: sellerAgentId,
          note: 'Offer accepted by seller.',
          metadata: {
            acceptedPriceAmount: offer.priceAmount,
            acceptedQuantity: offer.quantity,
          },
        },
      });

      return updatedOffer;
    });
  }

  static async rejectOffer(id: string, agentId: string) {
    return await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id },
        include: { listing: true },
      });

      if (!offer) {
        throw new AppError('OFFER_NOT_FOUND', 'Offer not found', 404);
      }

      // Auth validation (Involved role)
      const isBuyer = offer.buyerAgentId === agentId;
      const isSeller = offer.listing.sellerAgentId === agentId;
      if (!isBuyer && !isSeller) {
        throw new AppError('FORBIDDEN', 'You do not have access to this offer', 403);
      }

      if (offer.status === 'rejected') {
        return offer;
      }

      // Buyer rejects counter offer, Seller rejects original offer.
      if (isBuyer && offer.status !== 'countered') {
        throw new AppError('INVALID_OFFER_STATUS', 'Buyer can only reject counter-offers', 400);
      }
      if (isSeller && offer.status !== 'pending') {
        throw new AppError('INVALID_OFFER_STATUS', 'Seller can only reject pending offers', 400);
      }

      // Expiration check
      await this.checkAndEnforceExpirationTx(tx, id, offer);

      const updatedOffer = await tx.offer.update({
        where: { id },
        data: { status: 'rejected' },
      });

      await tx.offerHistory.create({
        data: {
          offerId: id,
          fromStatus: offer.status,
          toStatus: 'rejected',
          event: 'OFFER_REJECTED',
          actorId: agentId,
          note: isBuyer ? 'Counter-offer rejected by buyer.' : 'Offer rejected by seller.',
        },
      });

      return updatedOffer;
    });
  }

  static async counterOffer(id: string, sellerAgentId: string, input: CreateCounterOfferInput) {
    if (input.counterPriceAmount <= 0) {
      throw new AppError('VALIDATION_ERROR', 'Counter price amount must be greater than zero', 400);
    }
    if (input.counterQuantity <= 0) {
      throw new AppError('VALIDATION_ERROR', 'Counter quantity must be greater than zero', 400);
    }
    if (input.note && input.note.length > 500) {
      throw new AppError('VALIDATION_ERROR', 'Note cannot exceed 500 characters', 400);
    }

    const counterExpiresAt = this.validateExpiration(input.counterExpiresAt, this.MAX_EXPIRATION_MS);

    return await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id },
        include: { listing: true },
      });

      if (!offer) {
        throw new AppError('OFFER_NOT_FOUND', 'Offer not found', 404);
      }

      // Auth validation
      if (offer.listing.sellerAgentId !== sellerAgentId) {
        throw new AppError('FORBIDDEN', 'You are not the seller for this listing', 403);
      }

      if (
        offer.status === 'countered' &&
        offer.counterPriceAmount === input.counterPriceAmount &&
        offer.counterQuantity === input.counterQuantity &&
        offer.counterExpiresAt?.getTime() === counterExpiresAt.getTime()
      ) {
        return offer;
      }

      // Expiration check
      await this.checkAndEnforceExpirationTx(tx, id, offer);

      if (offer.status !== 'pending' && offer.status !== 'countered') {
        throw new AppError('INVALID_OFFER_STATUS', `Cannot counter offer with status ${offer.status}`, 400);
      }

      const updatedOffer = await tx.offer.update({
        where: { id },
        data: {
          status: 'countered',
          counterPriceAmount: input.counterPriceAmount,
          counterQuantity: input.counterQuantity,
          counterExpiresAt,
        },
      });

      await tx.offerHistory.create({
        data: {
          offerId: id,
          fromStatus: offer.status,
          toStatus: 'countered',
          event: 'OFFER_COUNTERED',
          actorId: sellerAgentId,
          note: input.note || 'Counter-offer made by seller.',
          metadata: {
            counterPriceAmount: input.counterPriceAmount,
            counterQuantity: input.counterQuantity,
            counterExpiresAt: counterExpiresAt.toISOString(),
          },
        },
      });

      return updatedOffer;
    });
  }

  static async acceptCounter(id: string, buyerAgentId: string) {
    return await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id },
        include: { listing: true },
      });

      if (!offer) {
        throw new AppError('OFFER_NOT_FOUND', 'Offer not found', 404);
      }

      // Auth validation
      if (offer.buyerAgentId !== buyerAgentId) {
        throw new AppError('FORBIDDEN', 'You are not the buyer for this offer', 403);
      }

      if (offer.status === 'accepted' && offer.acceptedByAgentId === buyerAgentId) {
        return offer;
      }

      // Expiration check
      await this.checkAndEnforceExpirationTx(tx, id, offer);

      if (offer.status !== 'countered') {
        throw new AppError('INVALID_OFFER_STATUS', `Cannot accept counter for offer with status ${offer.status}`, 400);
      }

      if (!offer.counterPriceAmount || !offer.counterQuantity) {
        throw new AppError('VALIDATION_ERROR', 'Counter offer price and quantity must be defined', 400);
      }

      // Lock listing for update to check inventory safely
      const listing = await tx.$queryRawUnsafe<any[]>(
        'SELECT * FROM "Listing" WHERE id = $1 FOR UPDATE',
        offer.listingId
      );
      const activeListing = listing[0];
      if (!activeListing || activeListing.status !== 'active') {
        throw new AppError('LISTING_NOT_ACTIVE', 'Listing is not active', 400);
      }
      if (activeListing.quantityAvailable < offer.counterQuantity) {
        throw new AppError('INSUFFICIENT_INVENTORY', 'Insufficient inventory to accept this counter-offer', 400);
      }

      const updatedOffer = await tx.offer.update({
        where: { id },
        data: {
          status: 'accepted',
          acceptedPriceAmount: offer.counterPriceAmount,
          acceptedQuantity: offer.counterQuantity,
          acceptedAt: new Date(),
          acceptedByAgentId: buyerAgentId,
        },
      });

      await tx.offerHistory.create({
        data: {
          offerId: id,
          fromStatus: 'countered',
          toStatus: 'accepted',
          event: 'COUNTER_ACCEPTED',
          actorId: buyerAgentId,
          note: 'Counter-offer accepted by buyer.',
          metadata: {
            acceptedPriceAmount: offer.counterPriceAmount,
            acceptedQuantity: offer.counterQuantity,
          },
        },
      });

      return updatedOffer;
    });
  }

  static async cancelOffer(id: string, buyerAgentId: string) {
    return await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.findUnique({
        where: { id },
        include: { listing: true },
      });

      if (!offer) {
        throw new AppError('OFFER_NOT_FOUND', 'Offer not found', 404);
      }

      // Auth validation
      if (offer.buyerAgentId !== buyerAgentId) {
        throw new AppError('FORBIDDEN', 'You are not the buyer for this offer', 403);
      }

      if (offer.status === 'cancelled') {
        return offer;
      }

      // Expiration check
      await this.checkAndEnforceExpirationTx(tx, id, offer);

      if (offer.status !== 'pending' && offer.status !== 'countered') {
        throw new AppError('INVALID_OFFER_STATUS', `Cannot cancel offer with status ${offer.status}`, 400);
      }

      const updatedOffer = await tx.offer.update({
        where: { id },
        data: { status: 'cancelled' },
      });

      await tx.offerHistory.create({
        data: {
          offerId: id,
          fromStatus: offer.status,
          toStatus: 'cancelled',
          event: 'OFFER_CANCELLED',
          actorId: buyerAgentId,
          note: 'Offer cancelled by buyer.',
        },
      });

      return updatedOffer;
    });
  }
}
