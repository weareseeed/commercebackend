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
        throw new Error(`CheckoutIntent ${checkoutIntentId} not found`);
      }

      if (intent.status === 'paid') {
        const existingOrder = await tx.order.findUnique({
          where: { checkoutIntentId },
        });
        return existingOrder;
      }

      await tx.checkoutIntent.update({
        where: { id: checkoutIntentId },
        data: {
          status: 'paid',
          stripePaymentIntentId,
        },
      });

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

      const listing = await tx.listing.findUnique({
        where: { id: intent.listingId },
      });

      if (!listing) {
        throw new Error(`Listing ${intent.listingId} not found`);
      }

      const newQty = Math.max(0, listing.quantityAvailable - intent.quantity);
      const newStatus = newQty === 0 ? 'sold_out' : listing.status;

      await tx.listing.update({
        where: { id: intent.listingId },
        data: {
          quantityAvailable: newQty,
          status: newStatus,
        },
      });

      return order;
    });
  }

  static async getOrders(agentId: string, role?: 'buyer' | 'seller') {
    if (role === 'buyer') {
      return prisma.order.findMany({
        where: { buyerAgentId: agentId },
      });
    }

    if (role === 'seller') {
      return prisma.order.findMany({
        where: { sellerAgentId: agentId },
      });
    }

    return prisma.order.findMany({
      where: {
        OR: [{ buyerAgentId: agentId }, { sellerAgentId: agentId }],
      },
    });
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
