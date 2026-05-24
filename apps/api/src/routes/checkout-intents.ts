import { FastifyInstance } from 'fastify';
import { CreateCheckoutIntentSchema } from '@commercebackend/schemas';
import { CheckoutService } from '../services/checkout.service';
import { authenticateAgent } from '../plugins/auth';
import { AppError } from '../plugins/error-handler';

export async function checkoutRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticateAgent);

  fastify.post('/v1/checkout-intents', async (request, reply) => {
    const agent = request.agent!;
    if (agent.type !== 'buyer' && agent.type !== 'both') {
      throw new AppError('FORBIDDEN', 'Only buyer agents can create checkout intents', 403);
    }

    const input = CreateCheckoutIntentSchema.parse(request.body);
    const checkoutIntent = await CheckoutService.createCheckoutIntent(agent.id, input);
    return reply.status(201).send({ checkoutIntent });
  });
}
