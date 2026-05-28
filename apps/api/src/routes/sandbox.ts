import { FastifyInstance } from 'fastify';
import { prisma, resetAndSeedSandbox, sandboxFixtureIds } from '@commercebackend/db';
import { SearchListingsRequestSchema } from '@commercebackend/schemas';
import { authenticateOperator } from '../plugins/auth';
import { AppError } from '../plugins/error-handler';
import { env } from '../env';
import { ListingsService } from '../services/listings.service';
import { SearchService } from '../services/search.service';
import { OrdersService } from '../services/orders.service';

function assertSandboxEnabled() {
  if (env.NODE_ENV === 'production' && !env.SANDBOX_MODE) {
    throw new AppError('NOT_FOUND', 'Sandbox routes are not enabled', 404);
  }
}

export async function sandboxRoutes(fastify: FastifyInstance) {
  fastify.get('/v1/public/listings', async (request) => {
    assertSandboxEnabled();
    const { limit: limitQuery, offset: offsetQuery } = request.query as {
      limit?: string;
      offset?: string;
    };

    const rawLimit = limitQuery ? parseInt(limitQuery, 10) : 20;
    const rawOffset = offsetQuery ? parseInt(offsetQuery, 10) : 0;
    const limit = Math.min(100, Math.max(1, Number.isNaN(rawLimit) ? 20 : rawLimit));
    const offset = Math.max(0, Number.isNaN(rawOffset) ? 0 : rawOffset);

    const listings = await ListingsService.listPublicListings(limit, offset);
    return {
      listings,
      pagination: {
        limit,
        offset,
        total: listings.length,
      },
    };
  });

  fastify.get('/v1/public/listings/:id', async (request) => {
    assertSandboxEnabled();
    const { id } = request.params as { id: string };
    const listing = await ListingsService.getPublicListingById(id);
    return { listing };
  });

  fastify.post('/v1/public/search', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
      },
    },
  }, async (request) => {
    assertSandboxEnabled();
    const input = SearchListingsRequestSchema.parse(request.body ?? {});
    const { results, total } = await SearchService.searchListings(
      null,
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

  fastify.get('/v1/sandbox/fixtures', async () => {
    assertSandboxEnabled();
    return {
      mode: env.SANDBOX_MODE ? 'sandbox' : env.NODE_ENV,
      stripeMode: env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'test' : 'configured',
      manifest: {
        sellerAgentId: sandboxFixtureIds.sellerAgentId,
        buyerAgentIds: {
          autoApproved: sandboxFixtureIds.autoBuyerAgentId,
          approvalRequired: sandboxFixtureIds.approvalBuyerAgentId,
        },
        listingIds: sandboxFixtureIds.listings,
        purchasePolicyIds: sandboxFixtureIds.purchasePolicies,
        offerIds: sandboxFixtureIds.offers,
        checkoutIntentIds: sandboxFixtureIds.checkoutIntents,
      },
      publicReadEndpoints: {
        listings: '/v1/public/listings',
        listingDetail: '/v1/public/listings/:id',
        search: '/v1/public/search',
      },
      notes: [
        'Sandbox data is fictional and may be reset by operators.',
        'Public read endpoints are unauthenticated; write flows still require agent credentials.',
        'Stripe checkout remains test mode only.',
      ],
    };
  });

  fastify.post('/v1/sandbox/reset', {
    preHandler: authenticateOperator,
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  }, async () => {
    assertSandboxEnabled();
    const result = await resetAndSeedSandbox();
    return {
      ok: true,
      message: 'Sandbox fixtures reset successfully.',
      ...result,
    };
  });

  fastify.post('/v1/sandbox/checkout-intents/:id/simulate-complete', {
    preHandler: authenticateOperator,
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  }, async (request) => {
    assertSandboxEnabled();
    const { id } = request.params as { id: string };

    const checkoutIntent = await prisma.checkoutIntent.findUnique({ where: { id } });
    if (!checkoutIntent) {
      throw new AppError('CHECKOUT_INTENT_NOT_FOUND', 'Checkout intent not found', 404);
    }

    const sessionId = checkoutIntent.stripeCheckoutSessionId || `cs_simulated_${id}`;
    const paymentIntentId = `pi_simulated_${id}`;
    const order = await OrdersService.handleSuccessfulPayment(id, paymentIntentId, sessionId);
    const listing = await prisma.listing.findUnique({ where: { id: checkoutIntent.listingId } });
    const refreshedIntent = await prisma.checkoutIntent.findUnique({ where: { id } });

    return {
      ok: true,
      checkoutIntent: refreshedIntent,
      order,
      listing,
    };
  });
}
