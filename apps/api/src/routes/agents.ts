import { FastifyInstance } from 'fastify';
import { CreateAgentSchema } from '@commercebackend/schemas';
import { AgentsService } from '../services/agents.service';
import { authenticateAgent } from '../plugins/auth';
import { isTest } from '../env';

export async function agentRoutes(fastify: FastifyInstance) {
  // Registration is unauthenticated and mints API keys, so it is the prime
  // abuse vector on a public deployment. Cap it tightly per IP. Disabled under
  // test so the suite stays deterministic (mirrors the global limit).
  fastify.post('/v1/agents', {
    config: {
      rateLimit: isTest ? false : { max: 10, timeWindow: '1 minute' },
    },
  }, async (request, reply) => {
    const input = CreateAgentSchema.parse(request.body);
    const result = await AgentsService.createAgent(input);
    return reply.status(201).send(result);
  });

  fastify.get('/v1/agents/me', { preHandler: authenticateAgent }, async (request) => {
    const agent = request.agent!;
    const reputation = await AgentsService.getReputation(agent.id);
    return {
      agent: { ...agent, reputation },
    };
  });

  // Another agent's public profile — e.g. a buyer checking a seller's
  // reputation before making an offer. Any authenticated agent may look up
  // any other agent this way; the response omits ownerEmail (see
  // AgentsService.getAgentById), so it never leaks a counterparty's contact
  // info, only what a future purchase-policy trust check needs.
  fastify.get<{ Params: { id: string } }>(
    '/v1/agents/:id',
    { preHandler: authenticateAgent },
    async (request) => {
      const agent = await AgentsService.getAgentById(request.params.id);
      return { agent };
    }
  );
}
