import { FastifyInstance } from 'fastify';
import { CreateCheckoutIntentSchema, RejectCheckoutIntentApprovalSchema } from '@commercebackend/schemas';
import { CheckoutService } from '../services/checkout.service';
import { authenticateAgent, authenticateOperator } from '../plugins/auth';
import { AppError } from '../plugins/error-handler';

export async function checkoutRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/checkout-intents', { preHandler: authenticateAgent }, async (request, reply) => {
    const agent = request.agent!;
    if (agent.type !== 'buyer' && agent.type !== 'both') {
      throw new AppError('FORBIDDEN', 'Only buyer agents can create checkout intents', 403);
    }

    const input = CreateCheckoutIntentSchema.parse(request.body);
    const checkoutIntent = await CheckoutService.createCheckoutIntent(agent.id, input);
    return reply.status(201).send({ checkoutIntent });
  });

  fastify.post('/v1/checkout-intents/:id/approve', { preHandler: authenticateOperator }, async (request) => {
    const params = request.params as { id: string };
    const checkoutIntent = await CheckoutService.approveCheckoutIntent(params.id);
    return { checkoutIntent };
  });

  fastify.post('/v1/checkout-intents/:id/reject', { preHandler: authenticateOperator }, async (request) => {
    const params = request.params as { id: string };
    const input = RejectCheckoutIntentApprovalSchema.parse(request.body ?? {});
    const checkoutIntent = await CheckoutService.rejectCheckoutIntent(params.id, input.reason);
    return { checkoutIntent };
  });
}
