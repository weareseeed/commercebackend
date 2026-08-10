import { FastifyInstance } from 'fastify';
import { CreateAgentSchema } from '@commercebackend/schemas';
import { AgentsService } from '../services/agents.service';
import { authenticateAgent } from '../plugins/auth';

export async function agentRoutes(fastify: FastifyInstance) {
  // Registration is unauthenticated and mints API keys, so it is the prime
  // abuse vector on a public deployment. Cap it tightly per IP. Disabled under
  // test so the suite stays deterministic (mirrors the global limit).
  fastify.post('/v1/agents', {
    config: {
      rateLimit:
        process.env.NODE_ENV === 'test' ? false : { max: 10, timeWindow: '1 minute' },
    },
  }, async (request, reply) => {
    const input = CreateAgentSchema.parse(request.body);
    const result = await AgentsService.createAgent(input);
    return reply.status(201).send(result);
  });

  fastify.get('/v1/agents/me', { preHandler: authenticateAgent }, async (request, reply) => {
    return {
      agent: request.agent,
    };
  });
}
