import { FastifyInstance } from 'fastify';
import { CreateOfferSchema, CreateCounterOfferSchema } from '@commercebackend/schemas';
import { OffersService } from '../services/offers.service';
import { authenticateAgent } from '../plugins/auth';
import { AppError } from '../plugins/error-handler';

export async function offersRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticateAgent);

  // Create offer
  fastify.post('/v1/listings/:id/offers', async (request, reply) => {
    const agent = request.agent!;
    if (agent.type !== 'buyer' && agent.type !== 'both') {
      throw new AppError('FORBIDDEN', 'Only buyer agents can create offers', 403);
    }

    const { id: listingId } = request.params as { id: string };
    const input = CreateOfferSchema.parse(request.body);

    const offer = await OffersService.createOffer(agent.id, listingId, input);
    return reply.status(201).send({ offer });
  });

  // Get list of offers
  fastify.get('/v1/offers', async (request, reply) => {
    const agent = request.agent!;
    const { role, status } = request.query as { role: string; status?: string };

    if (!role || (role !== 'buyer' && role !== 'seller')) {
      throw new AppError('VALIDATION_ERROR', "Query parameter 'role' must be 'buyer' or 'seller'", 400);
    }

    const offers = await OffersService.getOffers(agent.id, role, status);
    return { offers };
  });

  // Get offer details
  fastify.get('/v1/offers/:id', async (request, reply) => {
    const agent = request.agent!;
    const { id } = request.params as { id: string };

    const offer = await OffersService.getOfferById(id, agent.id);
    return { offer };
  });

  // Accept offer (Seller only)
  fastify.post('/v1/offers/:id/accept', async (request, reply) => {
    const agent = request.agent!;
    if (agent.type !== 'seller' && agent.type !== 'both') {
      throw new AppError('FORBIDDEN', 'Only seller agents can accept offers', 403);
    }

    const { id } = request.params as { id: string };
    const offer = await OffersService.acceptOffer(id, agent.id);
    return { offer };
  });

  // Reject offer (Involved agents)
  fastify.post('/v1/offers/:id/reject', async (request, reply) => {
    const agent = request.agent!;
    const { id } = request.params as { id: string };

    const offer = await OffersService.rejectOffer(id, agent.id);
    return { offer };
  });

  // Counter offer (Seller only)
  fastify.post('/v1/offers/:id/counter', async (request, reply) => {
    const agent = request.agent!;
    if (agent.type !== 'seller' && agent.type !== 'both') {
      throw new AppError('FORBIDDEN', 'Only seller agents can counter offers', 403);
    }

    const { id } = request.params as { id: string };
    const input = CreateCounterOfferSchema.parse(request.body);

    const offer = await OffersService.counterOffer(id, agent.id, input);
    return { offer };
  });

  // Accept counter-offer (Buyer only)
  fastify.post('/v1/offers/:id/accept-counter', async (request, reply) => {
    const agent = request.agent!;
    if (agent.type !== 'buyer' && agent.type !== 'both') {
      throw new AppError('FORBIDDEN', 'Only buyer agents can accept counter-offers', 403);
    }

    const { id } = request.params as { id: string };
    const offer = await OffersService.acceptCounter(id, agent.id);
    return { offer };
  });

  // Cancel offer (Buyer only)
  fastify.post('/v1/offers/:id/cancel', async (request, reply) => {
    const agent = request.agent!;
    if (agent.type !== 'buyer' && agent.type !== 'both') {
      throw new AppError('FORBIDDEN', 'Only buyer agents can cancel offers', 403);
    }

    const { id } = request.params as { id: string };
    const offer = await OffersService.cancelOffer(id, agent.id);
    return { offer };
  });
}
