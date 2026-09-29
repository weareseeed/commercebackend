import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateOperator } from '../plugins/auth';
import { CatalogSyncService } from '../services/catalog-sync.service';

// Catalog connector routes (weekly backlog items 8/9/13: Shopify, Square, and
// BigCommerce connector spikes, all read-only). Operator-gated: triggering an
// external-catalog import is an operational action, not something a
// buyer/seller agent's own bearer key should be able to do. The imported
// listings themselves are ordinary `Listing` rows and show up through the
// existing, unchanged agent-facing search/listing endpoints — no new
// agent-facing surface here.
const SyncCatalogSchema = z.object({
  sellerAgentId: z.string().min(1, 'sellerAgentId is required'),
});

export async function connectorRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/v1/connectors/square/sync',
    { preHandler: authenticateOperator },
    async (request, reply) => {
      const input = SyncCatalogSchema.parse(request.body);
      const syncLog = await CatalogSyncService.syncSquareCatalog(input.sellerAgentId);
      return reply.status(201).send({ syncLog });
    }
  );

  fastify.post(
    '/v1/connectors/shopify/sync',
    { preHandler: authenticateOperator },
    async (request, reply) => {
      const input = SyncCatalogSchema.parse(request.body);
      const syncLog = await CatalogSyncService.syncShopifyCatalog(input.sellerAgentId);
      return reply.status(201).send({ syncLog });
    }
  );

  fastify.post(
    '/v1/connectors/bigcommerce/sync',
    { preHandler: authenticateOperator },
    async (request, reply) => {
      const input = SyncCatalogSchema.parse(request.body);
      const syncLog = await CatalogSyncService.syncBigCommerceCatalog(input.sellerAgentId);
      return reply.status(201).send({ syncLog });
    }
  );

  fastify.get('/v1/connectors/sync-logs', { preHandler: authenticateOperator }, async (request) => {
    const { limit: limitQuery, offset: offsetQuery } = request.query as {
      limit?: string;
      offset?: string;
    };

    const rawLimit = limitQuery ? parseInt(limitQuery, 10) : 20;
    const rawOffset = offsetQuery ? parseInt(offsetQuery, 10) : 0;
    const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

    const syncLogs = await CatalogSyncService.listSyncLogs(limit, offset);
    return { syncLogs, pagination: { limit, offset } };
  });
}
