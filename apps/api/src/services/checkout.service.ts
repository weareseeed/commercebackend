import { prisma } from '@commercebackend/db';
import { CreateCheckoutIntentInput } from '@commercebackend/schemas';
import { createStripeCheckoutSession } from '@commercebackend/payments-stripe';
import { ListingsService } from './listings.service';
import { AppError } from '../plugins/error-handler';

type PolicyDecision = 'policy_approved' | 'human_approval_required' | 'no_policy';

type CheckoutIntentWithApproval = {
  id: string;
  listingId: string;
  buyerAgentId: string;
  sellerAgentId: string;
  quantity: number;
  amountTotal: number;
  currency: string;
  offerId?: string | null;
  successUrl?: string | null;
  cancelUrl?: string | null;
};

export class CheckoutService {
  private static async evaluatePurchasePolicy(
    buyerAgentId: string,
    listing: any,
    amountTotal: number,
    hasOffer: boolean
  ): Promise<{ purchasePolicyId: string | null; policyDecision: PolicyDecision }> {
    const purchasePolicy = await prisma.purchasePolicy.findFirst({
      where: {
        buyerAgentId,
        enabled: true,
        currency: listing.currency,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!purchasePolicy) {
      return { purchasePolicyId: null, policyDecision: 'human_approval_required' };
    }

    const listingTypeAllowed =
      purchasePolicy.allowedListingTypes.length === 0 ||
      purchasePolicy.allowedListingTypes.includes(listing.type);
    const sellerAllowed =
      purchasePolicy.allowedSellerAgentIds.length === 0 ||
      purchasePolicy.allowedSellerAgentIds.includes(listing.sellerAgentId);
    const offerRequiresApproval = hasOffer && purchasePolicy.requireHumanApprovalForOffers;
    const amountRequiresApproval =
      amountTotal > purchasePolicy.maxAutoApproveAmount ||
      amountTotal > purchasePolicy.requireHumanApprovalAboveAmount;

    if (!listingTypeAllowed || !sellerAllowed || offerRequiresApproval || amountRequiresApproval) {
      return {
        purchasePolicyId: purchasePolicy.id,
        policyDecision: 'human_approval_required',
      };
    }

    return { purchasePolicyId: purchasePolicy.id, policyDecision: 'policy_approved' };
  }

  private static async createAndPersistStripeSession(
    checkoutIntent: CheckoutIntentWithApproval,
    listing: any,
    priceAmount: number,
    successUrl: string,
    cancelUrl: string,
    statusAfterSession: 'open' | 'human_approved'
  ) {
    let stripeSession: any = null;
    try {
      stripeSession = await createStripeCheckoutSession({
        checkoutIntentId: checkoutIntent.id,
        listingId: listing.id,
        title: listing.title,
        priceAmount,
        quantity: checkoutIntent.quantity,
        currency: listing.currency,
        buyerAgentId: checkoutIntent.buyerAgentId,
        sellerAgentId: listing.sellerAgentId,
        successUrl,
        cancelUrl,
        idempotencyKey: `checkout_intent_stripe_${checkoutIntent.id}`,
      });
    } catch (err: any) {
      await CheckoutService.markCheckoutFailedAndMaybeRevertOffer(
        checkoutIntent.id,
        checkoutIntent.offerId || null,
        checkoutIntent.buyerAgentId,
        `Stripe checkout creation failure: ${err.message}`
      );

      throw new AppError(
        'CHECKOUT_CREATION_FAILED',
        `Failed to create checkout session: ${err.message}`,
        500
      );
    }

    try {
      return await prisma.checkoutIntent.update({
        where: { id: checkoutIntent.id },
        data: {
          status: statusAfterSession,
          stripeCheckoutSessionId: stripeSession.id,
          checkoutUrl: stripeSession.url,
          ...(statusAfterSession === 'human_approved' ? { humanApprovedAt: new Date() } : {}),
        },
      });
    } catch (err: any) {
      console.error(
        JSON.stringify({
          level: 'critical',
          code: 'CHECKOUT_PERSISTENCE_FAILED',
          stripeSessionId: stripeSession.id,
          checkoutIntentId: checkoutIntent.id,
          offerId: checkoutIntent.offerId || null,
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

  private static async markCheckoutFailedAndMaybeRevertOffer(
    checkoutIntentId: string,
    offerId: string | null,
    buyerAgentId: string,
    note: string
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.checkoutIntent.update({
        where: { id: checkoutIntentId },
        data: { status: 'failed' },
      });

      if (offerId) {
        await tx.offer.update({
          where: { id: offerId },
          data: { status: 'accepted' },
        });

        await tx.offerHistory.create({
          data: {
            offerId,
            fromStatus: 'checkout_pending',
            toStatus: 'accepted',
            event: 'OFFER_REVERTED_STRIPE_FAILED',
            actorId: buyerAgentId,
            note: `Reverted to accepted due to ${note}`,
          },
        });
      }
    });
  }

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

      const policyEvaluation = await CheckoutService.evaluatePurchasePolicy(
        buyerAgentId,
        listing,
        amountTotal,
        Boolean(input.offerId)
      );

      return await tx.checkoutIntent.create({
        data: {
          listingId: listing.id,
          buyerAgentId,
          sellerAgentId: listing.sellerAgentId,
          quantity: input.quantity,
          amountSubtotal: amountTotal,
          amountTotal,
          currency: listing.currency,
          status:
            policyEvaluation.policyDecision === 'human_approval_required'
              ? 'human_approval_required'
              : 'open',
          stripeCheckoutSessionId: null,
          checkoutUrl: null,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          purchasePolicyId: policyEvaluation.purchasePolicyId,
          policyDecision: policyEvaluation.policyDecision,
          approvalRequestedAt:
            policyEvaluation.policyDecision === 'human_approval_required' ? new Date() : null,
          offerId: input.offerId || null,
        },
      });
    });

    if (checkoutIntent.status === 'human_approval_required') {
      return checkoutIntent;
    }

    return CheckoutService.createAndPersistStripeSession(
      checkoutIntent,
      listing,
      price,
      input.successUrl,
      input.cancelUrl,
      'open'
    );
  }

  static async approveCheckoutIntent(id: string) {
    const intent = await prisma.checkoutIntent.findUnique({ where: { id } });
    if (!intent) {
      throw new AppError('CHECKOUT_INTENT_NOT_FOUND', 'Checkout intent not found', 404);
    }
    if (intent.status !== 'human_approval_required') {
      throw new AppError('INVALID_CHECKOUT_STATUS', `Cannot approve checkout intent with status ${intent.status}`, 400);
    }
    if (!intent.successUrl || !intent.cancelUrl) {
      throw new AppError('CHECKOUT_APPROVAL_NOT_READY', 'Checkout intent is missing redirect URLs', 400);
    }

    const listing = await ListingsService.getListingById(intent.listingId);
    if (listing.status !== 'active') {
      throw new AppError('LISTING_NOT_ACTIVE', 'Listing is not active', 400);
    }
    if (listing.quantityAvailable < intent.quantity) {
      throw new AppError('INSUFFICIENT_INVENTORY', 'Requested quantity exceeds available stock', 400);
    }
    const priceAmount = Math.floor(intent.amountTotal / intent.quantity);

    return CheckoutService.createAndPersistStripeSession(
      intent,
      listing,
      priceAmount,
      intent.successUrl,
      intent.cancelUrl,
      'human_approved'
    );
  }

  static async rejectCheckoutIntent(id: string, reason?: string) {
    const intent = await prisma.checkoutIntent.findUnique({ where: { id } });
    if (!intent) {
      throw new AppError('CHECKOUT_INTENT_NOT_FOUND', 'Checkout intent not found', 404);
    }
    if (intent.status !== 'human_approval_required') {
      throw new AppError('INVALID_CHECKOUT_STATUS', `Cannot reject checkout intent with status ${intent.status}`, 400);
    }

    return await prisma.$transaction(async (tx) => {
      const updatedIntent = await tx.checkoutIntent.update({
        where: { id },
        data: {
          status: 'human_rejected',
          humanRejectedAt: new Date(),
          approvalRejectionReason: reason || null,
        },
      });

      if (intent.offerId) {
        await tx.offer.update({
          where: { id: intent.offerId },
          data: { status: 'accepted' },
        });

        await tx.offerHistory.create({
          data: {
            offerId: intent.offerId,
            fromStatus: 'checkout_pending',
            toStatus: 'accepted',
            event: 'OFFER_REVERTED_APPROVAL_REJECTED',
            actorId: 'operator',
            note: reason || 'Checkout approval rejected.',
          },
        });
      }

      return updatedIntent;
    });
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
