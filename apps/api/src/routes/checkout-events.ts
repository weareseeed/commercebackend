import { FastifyInstance } from 'fastify';
import { authenticateOperator } from '../plugins/auth';
import { CheckoutEventsService } from '../services/checkout-events.service';

export async function checkoutEventsRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/operator/checkout-intents/:id/events', {
    preHandler: authenticateOperator,
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
  }, async (request) => {
    const params = request.params as { id: string };
    return CheckoutEventsService.getLedger(params.id);
  });
}
