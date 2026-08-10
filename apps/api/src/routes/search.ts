import { FastifyInstance } from 'fastify';
import { SearchListingsRequestSchema } from '@commercebackend/schemas';
import { SearchService } from '../services/search.service';
import { authenticateAgent } from '../plugins/auth';

export async function searchRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticateAgent);

  // Search runs an in-memory scan/scoring pass, so it is comparatively
  // expensive; cap it per IP. Disabled under test for a deterministic suite.
  fastify.post('/v1/search', {
    config: {
      rateLimit:
        process.env.NODE_ENV === 'test' ? false : { max: 60, timeWindow: '1 minute' },
    },
  }, async (request, reply) => {
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
