import { FastifyInstance } from 'fastify';
import { SearchListingsRequestSchema } from '@commercebackend/schemas';
import { SearchService } from '../services/search.service';
import { authenticateAgent } from '../plugins/auth';

export async function searchRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticateAgent);

  fastify.post('/v1/search', async (request, reply) => {
    const agent = request.agent!;
    const input = SearchListingsRequestSchema.parse(request.body);

    const { results, total } = await SearchService.searchListings(
      agent.id,
      input.query,
      input.filters,
      input.limit,
      input.offset
    );

    return {
      results,
      pagination: {
        limit: input.limit,
        offset: input.offset,
        total,
      },
    };
  });
}
