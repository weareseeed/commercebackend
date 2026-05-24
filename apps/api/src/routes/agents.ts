import { FastifyInstance } from 'fastify';
import { CreateAgentSchema } from '@commercebackend/schemas';
import { AgentsService } from '../services/agents.service';
import { authenticateAgent } from '../plugins/auth';

export async function agentRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/agents', async (request, reply) => {
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
