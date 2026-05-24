import { FastifyInstance } from 'fastify';
import { CreateListingSchema, UpdateListingSchema } from '@commercebackend/schemas';
import { ListingsService } from '../services/listings.service';
import { authenticateAgent } from '../plugins/auth';
import { AppError } from '../plugins/error-handler';

export async function listingRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticateAgent);

  fastify.post('/v1/listings', async (request, reply) => {
    const agent = request.agent!;
    if (agent.type !== 'seller' && agent.type !== 'both') {
      throw new AppError('FORBIDDEN', 'Only seller agents can create listings', 403);
    }

    const input = CreateListingSchema.parse(request.body);
    const listing = await ListingsService.createListing(agent.id, input);
    return reply.status(201).send({ listing });
  });

  fastify.get('/v1/listings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const listing = await ListingsService.getListingById(id);
    return { listing };
  });

  fastify.patch('/v1/listings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const agent = request.agent!;
    const input = UpdateListingSchema.parse(request.body);

    const listing = await ListingsService.updateListing(id, agent.id, input);
    return { listing };
  });

  fastify.post('/v1/listings/:id/pause', async (request, reply) => {
    const { id } = request.params as { id: string };
    const agent = request.agent!;

    const listing = await ListingsService.pauseListing(id, agent.id);
    return { listing };
  });

  fastify.post('/v1/listings/:id/activate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const agent = request.agent!;

    const listing = await ListingsService.activateListing(id, agent.id);
    return { listing };
  });
}
