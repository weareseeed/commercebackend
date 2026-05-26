import { prisma } from '@commercebackend/db';
import { CreateCheckoutIntentInput } from '@commercebackend/schemas';
import { createStripeCheckoutSession } from '@commercebackend/payments-stripe';
import { ListingsService } from './listings.service';
import { AppError } from '../plugins/error-handler';

export class CheckoutService {
  static async createCheckoutIntent(buyerAgentId: string, input: CreateCheckoutIntentInput) {
    const listing = await ListingsService.getListingById(input.listingId);

    if (listing.status === 'paused') {
      throw new AppError('LISTING_NOT_ACTIVE', 'Listing is paused', 400);
    }

    if (listing.status === 'sold_out' || listing.quantityAvailable === 0) {
      throw new AppError('LISTING_OUT_OF_STOCK', 'Listing is out of stock', 400);
    }

    if (listing.status !== 'active') {
      throw new AppError('LISTING_NOT_ACTIVE', 'Listing is not active', 400);
    }

    if (listing.sellerAgentId === buyerAgentId) {
      throw new AppError('SELF_PURCHASE_NOT_ALLOWED', 'Buyer agent cannot purchase their own listing', 403);
    }

    if (input.quantity <= 0) {
      throw new AppError('VALIDATION_ERROR', 'Quantity must be greater than zero', 400);
    }

    let price = listing.priceAmount;

    const checkoutIntent = await prisma.$transaction(async (tx) => {
      if (input.offerId) {
        const offer = await tx.offer.findUnique({
          where: { id: input.offerId },
          include: { listing: true },
        });

        if (!offer) {
          throw new AppError('OFFER_NOT_FOUND', 'Offer not found', 404);
        }
        if (offer.buyerAgentId !== buyerAgentId) {
          throw new AppError('FORBIDDEN', 'You do not have access to this offer', 403);
        }
        if (offer.listingId !== listing.id) {
          throw new AppError('VALIDATION_ERROR', 'Offer listing mismatch', 400);
        }

        // Transactional expiration check
        const now = new Date();
        const isExpired = 
          (offer.status === 'pending' && offer.expiresAt < now) ||
          (offer.status === 'countered' && offer.counterExpiresAt && offer.counterExpiresAt < now);

        if (isExpired) {
          await tx.offer.update({
            where: { id: offer.id },
            data: { status: 'expired' },
          });

          await tx.offerHistory.create({
            data: {
              offerId: offer.id,
              fromStatus: offer.status,
              toStatus: 'expired',
              event: 'OFFER_EXPIRED',
              actorId: 'system',
              note: 'Offer automatically marked as expired during checkout creation.',
              metadata: { checkedAt: now.toISOString() },
            },
          });

          throw new AppError('OFFER_EXPIRED', 'This offer has expired', 400);
        }

        if (offer.status === 'checkout_pending') {
          throw new AppError('OFFER_ALREADY_CHECKED_OUT', 'A checkout intent is already pending for this offer', 400);
        }
        if (offer.status !== 'accepted') {
          throw new AppError('INVALID_OFFER_STATUS', `Cannot checkout offer with status ${offer.status}`, 400);
        }
        if (input.quantity !== offer.acceptedQuantity) {
          throw new AppError('VALIDATION_ERROR', 'Requested quantity must match accepted offer quantity', 400);
        }

        price = offer.acceptedPriceAmount!;

        // Transition offer to checkout_pending
        await tx.offer.update({
          where: { id: offer.id },
          data: { status: 'checkout_pending' },
        });

        await tx.offerHistory.create({
          data: {
            offerId: offer.id,
            fromStatus: 'accepted',
            toStatus: 'checkout_pending',
            event: 'OFFER_CHECKOUT_PENDING',
            actorId: buyerAgentId,
            note: 'Checkout intent initiated.',
          },
        });
      }

      const amountTotal = price * input.quantity;

      // Lock listing for update to check inventory safely
      const listingRows = await tx.$queryRawUnsafe<any[]>(
        'SELECT * FROM "Listing" WHERE id = $1 FOR UPDATE',
        listing.id
      );
      const activeListing = listingRows[0];

      if (!activeListing || activeListing.status !== 'active') {
        throw new AppError('LISTING_NOT_ACTIVE', 'Listing is not active', 400);
      }
      if (activeListing.quantityAvailable < input.quantity) {
        throw new AppError('INSUFFICIENT_INVENTORY', 'Requested quantity exceeds available stock', 400);
      }

      return await tx.checkoutIntent.create({
        data: {
          listingId: listing.id,
          buyerAgentId,
          sellerAgentId: listing.sellerAgentId,
          quantity: input.quantity,
          amountSubtotal: amountTotal,
          amountTotal,
          currency: listing.currency,
          status: 'open',
          offerId: input.offerId || null,
        },
      });
    });

    let stripeSession: any = null;
    try {
      stripeSession = await createStripeCheckoutSession({
        checkoutIntentId: checkoutIntent.id,
        listingId: listing.id,
        title: listing.title,
        priceAmount: price,
        quantity: input.quantity,
        currency: listing.currency,
        buyerAgentId,
        sellerAgentId: listing.sellerAgentId,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        idempotencyKey: `checkout_intent_stripe_${checkoutIntent.id}`,
      });
    } catch (err: any) {
      await prisma.$transaction(async (tx) => {
        await tx.checkoutIntent.update({
          where: { id: checkoutIntent.id },
          data: { status: 'failed' },
        });

        if (input.offerId) {
          await tx.offer.update({
            where: { id: input.offerId },
            data: { status: 'accepted' },
          });

          await tx.offerHistory.create({
            data: {
              offerId: input.offerId,
              fromStatus: 'checkout_pending',
              toStatus: 'accepted',
              event: 'OFFER_REVERTED_STRIPE_FAILED',
              actorId: buyerAgentId,
              note: `Reverted to accepted due to Stripe checkout creation failure: ${err.message}`,
            },
          });
        }
      });

      throw new AppError(
        'CHECKOUT_CREATION_FAILED',
        `Failed to create checkout session: ${err.message}`,
        500
      );
    }

    try {
      const updatedIntent = await prisma.checkoutIntent.update({
        where: { id: checkoutIntent.id },
        data: {
          stripeCheckoutSessionId: stripeSession.id,
          checkoutUrl: stripeSession.url,
        },
      });

      return updatedIntent;
    } catch (err: any) {
      console.error(
        JSON.stringify({
          level: 'critical',
          code: 'CHECKOUT_PERSISTENCE_FAILED',
          stripeSessionId: stripeSession.id,
          checkoutIntentId: checkoutIntent.id,
          offerId: input.offerId || null,
          error: err.message,
        })
      );

      try {
        await prisma.checkoutIntent.update({
          where: { id: checkoutIntent.id },
          data: {
            status: 'failed',
            stripeCheckoutSessionId: stripeSession.id,
          },
        });
      } catch (innerDbErr: any) {
        console.error(`Failed to mark checkout intent as failed: ${innerDbErr.message}`);
      }

      throw new AppError(
        'CHECKOUT_PERSISTENCE_FAILED',
        `Stripe session created successfully (${stripeSession.id}) but failed to update checkout intent database state. Offer remains in checkout_pending state. Error: ${err.message}`,
        500
      );
    }
  }

  static async getCheckoutIntentById(id: string) {
    const intent = await prisma.checkoutIntent.findUnique({
      where: { id },
    });
    if (!intent) {
      throw new AppError('CHECKOUT_INTENT_NOT_FOUND', 'Checkout intent not found', 404);
    }
    return intent;
  }
}
