import { FastifyInstance } from 'fastify';
import { CreatePurchasePolicySchema } from '@commercebackend/schemas';
import { authenticateAgent, authenticateOperator } from '../plugins/auth';
import { AppError } from '../plugins/error-handler';
import { PurchasePoliciesService } from '../services/purchase-policies.service';

export async function purchasePolicyRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/agents/:buyerAgentId/purchase-policies', { preHandler: authenticateOperator }, async (request, reply) => {
    const params = request.params as { buyerAgentId: string };
    const input = CreatePurchasePolicySchema.parse(request.body);
    const purchasePolicy = await PurchasePoliciesService.createPurchasePolicy(params.buyerAgentId, input);
    return reply.status(201).send({ purchasePolicy });
  });

  fastify.get('/v1/purchase-policies', { preHandler: authenticateAgent }, async (request) => {
    const agent = request.agent!;
    if (agent.type !== 'buyer' && agent.type !== 'both') {
      throw new AppError('FORBIDDEN', 'Only buyer agents can list purchase policies', 403);
    }

    const purchasePolicies = await PurchasePoliciesService.listPurchasePolicies(agent.id);
    return { purchasePolicies };
  });
}
