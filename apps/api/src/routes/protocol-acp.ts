import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateCheckoutIntentSchema } from '@commercebackend/schemas';
import {
  mapListingToAcpCatalogItem,
  mapAcpCheckoutSessionCreateToCheckoutIntentInput,
  mapCheckoutIntentToAcpCheckoutSession,
  AcpMappingError,
} from '@commercebackend/protocol-acp';
import { ListingsService } from '../services/listings.service';
import { CheckoutService } from '../services/checkout.service';
import { authenticateAgent } from '../plugins/auth';
import { AppError } from '../plugins/error-handler';

// ACP (Agentic Commerce Protocol) adapter routes.
//
// This is CommerceBackend's own scoped subset of the public ACP spec: a
// product feed and a checkout-sessions API backed by the existing, unmodified
// Stripe-hosted-checkout-redirect flow (`CheckoutService`). It is not a
// certified or full ACP implementation. See `docs/api/protocol-acp.md` for
// the full list of unsupported fields (delegated payment token /
// `shared_payment_token` PSP handoff, session update/cancel, multi-item
// carts, tax, discounts, refunds).

const AcpCheckoutSessionCreateSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1, 'Line item id is required'),
        quantity: z.number().int().positive('Line item quantity must be a positive integer'),
      })
    )
    .min(1, 'At least one line item is required'),
  success_url: z.string().url('Invalid success_url'),
  cancel_url: z.string().url('Invalid cancel_url'),
  offer_id: z.string().optional(),
});

export async function protocolAcpRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/protocols/acp/product-feed', { preHandler: authenticateAgent }, async (request) => {
    const { limit: limitQuery, offset: offsetQuery } = request.query as {
      limit?: string;
      offset?: string;
    };

    // Default limit: 20, max limit: 100 — same bounds as /v1/orders.
    const rawLimit = limitQuery ? parseInt(limitQuery, 10) : 20;
    const rawOffset = offsetQuery ? parseInt(offsetQuery, 10) : 0;
    const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

    const listings = await ListingsService.listPublicListings(limit, offset);

    return {
      items: listings.map((listing) => mapListingToAcpCatalogItem(listing)),
      pagination: { limit, offset },
    };
  });

  fastify.post(
    '/v1/protocols/acp/checkout-sessions',
    { preHandler: authenticateAgent },
    async (request, reply) => {
      const agent = request.agent!;
      if (agent.type !== 'buyer' && agent.type !== 'both') {
        throw new AppError('FORBIDDEN', 'Only buyer agents can create ACP checkout sessions', 403);
      }

      const acpRequest = AcpCheckoutSessionCreateSchema.parse(request.body);

      let mappedInput;
      try {
        mappedInput = mapAcpCheckoutSessionCreateToCheckoutIntentInput(acpRequest);
      } catch (err: any) {
        if (err instanceof AcpMappingError) {
          throw new AppError('ACP_UNSUPPORTED_REQUEST', err.message, 400);
        }
        throw err;
      }

      // Re-validated through the same schema the native checkout-intents
      // route uses, so ACP-originated checkouts get identical guarantees.
      const input = CreateCheckoutIntentSchema.parse(mappedInput);
      const checkoutIntent = await CheckoutService.createCheckoutIntent(agent.id, input);

      return reply.status(201).send({
        checkoutSession: mapCheckoutIntentToAcpCheckoutSession(checkoutIntent),
      });
    }
  );

  fastify.get(
    '/v1/protocols/acp/checkout-sessions/:id',
    { preHandler: authenticateAgent },
    async (request) => {
      const agent = request.agent!;
      const { id } = request.params as { id: string };

      const checkoutIntent = await CheckoutService.getCheckoutIntentById(id);

      if (checkoutIntent.buyerAgentId !== agent.id && checkoutIntent.sellerAgentId !== agent.id) {
        throw new AppError('FORBIDDEN', 'You are not authorized to view this checkout session', 403);
      }

      return { checkoutSession: mapCheckoutIntentToAcpCheckoutSession(checkoutIntent) };
    }
  );
}
