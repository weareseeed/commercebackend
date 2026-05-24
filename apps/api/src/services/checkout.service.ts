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

    if (input.quantity > listing.quantityAvailable) {
      throw new AppError('INSUFFICIENT_INVENTORY', 'Requested quantity exceeds available stock', 400);
    }

    const price = listing.priceAmount;
    const amountTotal = price * input.quantity;

    const checkoutIntent = await prisma.checkoutIntent.create({
      data: {
        listingId: listing.id,
        buyerAgentId,
        sellerAgentId: listing.sellerAgentId,
        quantity: input.quantity,
        amountSubtotal: amountTotal,
        amountTotal,
        currency: listing.currency,
        status: 'open',
      },
    });

    try {
      const stripeSession = await createStripeCheckoutSession({
        checkoutIntentId: checkoutIntent.id,
        listingId: listing.id,
        title: listing.title,
        priceAmount: listing.priceAmount,
        quantity: input.quantity,
        currency: listing.currency,
        buyerAgentId,
        sellerAgentId: listing.sellerAgentId,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        idempotencyKey: `checkout_intent_stripe_${checkoutIntent.id}`,
      });

      const updatedIntent = await prisma.checkoutIntent.update({
        where: { id: checkoutIntent.id },
        data: {
          stripeCheckoutSessionId: stripeSession.id,
          checkoutUrl: stripeSession.url,
        },
      });

      return updatedIntent;
    } catch (err: any) {
      await prisma.checkoutIntent.update({
        where: { id: checkoutIntent.id },
        data: { status: 'failed' },
      });
      throw new AppError(
        'CHECKOUT_CREATION_FAILED',
        `Failed to create checkout session: ${err.message}`,
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
