import { prisma } from '@commercebackend/db';
import { AppError } from '../plugins/error-handler';

export class OrdersService {
  static async handleSuccessfulPayment(
    checkoutIntentId: string,
    stripePaymentIntentId: string | null
  ) {
    return await prisma.$transaction(async (tx) => {
      const intent = await tx.checkoutIntent.findUnique({
        where: { id: checkoutIntentId },
      });

      if (!intent) {
        throw new AppError('CHECKOUT_INTENT_NOT_FOUND', `CheckoutIntent ${checkoutIntentId} not found`, 404);
      }

      if (intent.status === 'paid') {
        const existingOrder = await tx.order.findUnique({
          where: { checkoutIntentId },
        });
        return existingOrder || null;
      }

      if (intent.status === 'payment_inventory_conflict') {
        return null;
      }

      // Lock the Listing row
      const listings = await tx.$queryRawUnsafe<any[]>(
        'SELECT * FROM "Listing" WHERE id = $1 FOR UPDATE',
        intent.listingId
      );

      const listing = listings?.[0];
      if (!listing) {
        throw new AppError('LISTING_NOT_FOUND', `Listing ${intent.listingId} not found`, 404);
      }

      // Check if stock is available
      if (listing.quantityAvailable < intent.quantity) {
        // Handle payment_inventory_conflict operational state:
        // Do not create order, do not decrement inventory.
        // TODO: v0.1 requires manual review / refund for this state.
        await tx.checkoutIntent.update({
          where: { id: checkoutIntentId },
          data: {
            status: 'payment_inventory_conflict',
            stripePaymentIntentId,
          },
        });

        if (intent.offerId) {
          await tx.offer.update({
            where: { id: intent.offerId },
            data: { status: 'cancelled' },
          });

          await tx.offerHistory.create({
            data: {
              offerId: intent.offerId,
              fromStatus: 'checkout_pending',
              toStatus: 'cancelled',
              event: 'OFFER_CANCELLED_INVENTORY_CONFLICT',
              actorId: 'system',
              note: 'Offer cancelled due to concurrent payment inventory conflict.',
            },
          });
        }
        return null;
      }

      // Decrement inventory
      const newQty = listing.quantityAvailable - intent.quantity;
      const newStatus = newQty === 0 ? 'sold_out' : listing.status;

      await tx.listing.update({
        where: { id: intent.listingId },
        data: {
          quantityAvailable: newQty,
          status: newStatus,
        },
      });

      // Update CheckoutIntent to paid
      await tx.checkoutIntent.update({
        where: { id: checkoutIntentId },
        data: {
          status: 'paid',
          stripePaymentIntentId,
        },
      });

      // Create Order
      const order = await tx.order.create({
        data: {
          checkoutIntentId,
          listingId: intent.listingId,
          buyerAgentId: intent.buyerAgentId,
          sellerAgentId: intent.sellerAgentId,
          quantity: intent.quantity,
          amountTotal: intent.amountTotal,
          currency: intent.currency,
          paymentStatus: 'paid',
          fulfillmentStatus: 'pending',
        },
      });

      return order;
    });
  }

  static async handleExpiredPayment(checkoutIntentId: string) {
    return await prisma.$transaction(async (tx) => {
      const intent = await tx.checkoutIntent.findUnique({
        where: { id: checkoutIntentId },
      });

      if (!intent || intent.status !== 'open') {
        return;
      }

      await tx.checkoutIntent.update({
        where: { id: checkoutIntentId },
        data: { status: 'expired' },
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
            event: 'OFFER_REVERTED_CHECKOUT_EXPIRED',
            actorId: 'system',
            note: 'Offer reverted to accepted because Stripe checkout session expired.',
          },
        });
      }
    });
  }

  static async getOrders(agentId: string, role?: 'buyer' | 'seller', limit = 20, offset = 0) {
    const where: any = {};
    if (role === 'buyer') {
      where.buyerAgentId = agentId;
    } else if (role === 'seller') {
      where.sellerAgentId = agentId;
    } else {
      where.OR = [{ buyerAgentId: agentId }, { sellerAgentId: agentId }];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  static async getOrderDetails(id: string, agentId: string) {
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    if (order.buyerAgentId !== agentId && order.sellerAgentId !== agentId) {
      throw new AppError('FORBIDDEN', 'You are not authorized to view this order', 403);
    }

    return order;
  }

  static async updateFulfillment(
    id: string,
    sellerAgentId: string,
    fulfillmentStatus: 'pending' | 'processing' | 'fulfilled' | 'cancelled',
    fulfillmentNote: string | null = null
  ) {
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
    }

    if (order.sellerAgentId !== sellerAgentId) {
      throw new AppError('FORBIDDEN', 'Only the seller agent can update fulfillment', 403);
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        fulfillmentStatus,
        fulfillmentNote,
      },
    });

    return updatedOrder;
  }
}
