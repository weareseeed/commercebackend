import { FastifyInstance } from 'fastify';
import {
  mapListingToUcpProduct,
  mapUcpOrderCreateToCheckoutIntentInput,
  mapCheckoutIntentToUcpOrder,
  UcpOrderCreateRequestSchema,
  UcpUnsupportedRequestError,
} from '@commercebackend/protocol-ucp';
import { ListingsService } from '../services/listings.service';
import { CheckoutService } from '../services/checkout.service';
import { authenticateAgent } from '../plugins/auth';
import { AppError } from '../plugins/error-handler';

/**
 * CommerceBackend's own vendor-neutral, schema.org-inspired commerce mapping
 * layer ("UCP" — see `packages/protocols/ucp` and `docs/api/protocol-ucp.md`
 * for why that name is not a claim of conformance to any named external
 * standard). These routes are a translation layer in front of the existing,
 * unmodified listing search and `CheckoutService` — no Stripe/webhook code is
 * touched here.
 */
export async function protocolUcpRoutes(fastify: FastifyInstance) {
  // Any authenticated agent may browse the UCP-shaped product catalog.
  fastify.get('/v1/protocols/ucp/products', { preHandler: authenticateAgent }, async (request) => {
    const { limit: limitQuery, offset: offsetQuery } = request.query as {
      limit?: string;
      offset?: string;
    };

    // Default limit: 20, max limit: 100 (mirrors GET /v1/orders).
    const rawLimit = limitQuery ? parseInt(limitQuery, 10) : 20;
    const rawOffset = offsetQuery ? parseInt(offsetQuery, 10) : 0;
    const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

    const [listings, total] = await Promise.all([
      ListingsService.listPublicListings(limit, offset),
      ListingsService.countPublicListings(),
    ]);

    return {
      products: listings.map(mapListingToUcpProduct),
      pagination: { limit, offset, total },
    };
  });

  // Buyer/both agents create a UCP-shaped order. Internally this maps onto
  // the existing, unmodified CreateCheckoutIntentInput -> CheckoutService
  // path; no Stripe/webhook behavior is added or changed.
  fastify.post('/v1/protocols/ucp/orders', { preHandler: authenticateAgent }, async (request, reply) => {
    const agent = request.agent!;
    if (agent.type !== 'buyer' && agent.type !== 'both') {
      throw new AppError('FORBIDDEN', 'Only buyer agents can create UCP orders', 403);
    }

    const parsed = UcpOrderCreateRequestSchema.parse(request.body);

    let checkoutInput;
    try {
      checkoutInput = mapUcpOrderCreateToCheckoutIntentInput(parsed);
    } catch (err) {
      if (err instanceof UcpUnsupportedRequestError) {
        throw new AppError(err.code, err.message, 400);
      }
      throw err;
    }

    const checkoutIntent = await CheckoutService.createCheckoutIntent(agent.id, checkoutInput);
    return reply.status(201).send({ order: mapCheckoutIntentToUcpOrder(checkoutIntent) });
  });

  // Only the buyer or seller agent on the underlying checkout intent may
  // view the UCP-shaped order (mirrors GET /v1/orders/:id in orders.ts).
  fastify.get('/v1/protocols/ucp/orders/:id', { preHandler: authenticateAgent }, async (request) => {
    const agent = request.agent!;
    const { id } = request.params as { id: string };

    const checkoutIntent = await CheckoutService.getCheckoutIntentById(id);

    if (checkoutIntent.buyerAgentId !== agent.id && checkoutIntent.sellerAgentId !== agent.id) {
      throw new AppError('FORBIDDEN', 'You are not authorized to view this UCP order', 403);
    }

    return { order: mapCheckoutIntentToUcpOrder(checkoutIntent) };
  });
}
