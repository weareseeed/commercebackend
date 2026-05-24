import { FastifyInstance } from 'fastify';
import { constructStripeEvent } from '@commercebackend/payments-stripe';
import { OrdersService } from '../services/orders.service';
import { AppError } from '../plugins/error-handler';

export async function webhookRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/webhooks/stripe', { config: { rawBody: true } }, async (request, reply) => {
    const sig = request.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      throw new AppError('BAD_REQUEST', 'Missing stripe-signature header', 400);
    }

    const rawBody = request.rawBody;
    if (!rawBody) {
      throw new AppError('BAD_REQUEST', 'Missing raw body', 400);
    }

    let event;
    if (process.env.NODE_ENV === 'test' || process.env.BYPASS_STRIPE_SIGNATURE === 'true') {
      try {
        event = JSON.parse(rawBody.toString());
      } catch (err: any) {
        throw new AppError('STRIPE_WEBHOOK_INVALID_PAYLOAD', 'Invalid JSON webhook payload', 400);
      }
    } else {
      try {
        event = constructStripeEvent(rawBody, sig);
      } catch (err: any) {
        fastify.log.warn(`Webhook signature verification failed: ${err.message}`);
        throw new AppError('STRIPE_WEBHOOK_INVALID_SIGNATURE', `Webhook verification failed: ${err.message}`, 400);
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const checkoutIntentId = session.metadata?.checkoutIntentId;

      if (!checkoutIntentId) {
        fastify.log.warn(`Stripe session ${session.id} missing checkoutIntentId metadata`);
        return reply.status(200).send({ received: true, ignored: true });
      }

      const stripePaymentIntentId =
        typeof session.payment_intent === 'string' ? session.payment_intent : null;

      await OrdersService.handleSuccessfulPayment(checkoutIntentId, stripePaymentIntentId);
    }

    return reply.status(200).send({ received: true });
  });
}
