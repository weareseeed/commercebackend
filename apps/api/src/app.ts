import fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyRawBody from 'fastify-raw-body';
import { registerErrorHandler } from './plugins/error-handler';
import { registerAuthPlugin } from './plugins/auth';
import { healthRoutes } from './routes/health';
import { agentRoutes } from './routes/agents';
import { listingRoutes } from './routes/listings';
import { searchRoutes } from './routes/search';
import { checkoutRoutes } from './routes/checkout-intents';
import { webhookRoutes } from './routes/webhooks-stripe';
import { orderRoutes } from './routes/orders';
import { offersRoutes } from './routes/offers';
import { purchasePolicyRoutes } from './routes/purchase-policies';
import { sandboxRoutes } from './routes/sandbox';

import crypto from 'crypto';

export function buildApp() {
  const app = fastify({
    logger: process.env.NODE_ENV !== 'test' ? {
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["stripe-signature"]',
          'req.headers.Authorization',
          'req.headers["Stripe-Signature"]',
          'req.headers["stripe_signature"]',
          'apiKey',
          'apiKeyHash',
          '*.apiKey',
          '*.apiKeyHash',
        ],
        censor: '[REDACTED]',
      },
    } : false,
    requestIdHeader: 'x-request-id',
    genReqId: (req) => {
      const header = req.headers['x-request-id'];
      if (header) {
        return Array.isArray(header) ? header[0] : header;
      }
      return `req_${crypto.randomUUID()}`;
    },
  });

  // Inject Request ID in response headers
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  // CORS Configuration
  app.register(cors, {
    origin: '*',
  });

  app.register(rateLimit, {
    global: false,
    keyGenerator: (request) => request.ip,
  });

  // Raw body configuration (specifically for stripe webhook signature checks)
  app.register(fastifyRawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
  });

  // Plugins
  registerErrorHandler(app);
  registerAuthPlugin(app);

  // Register Routes
  app.register(healthRoutes);
  app.register(agentRoutes);
  app.register(listingRoutes);
  app.register(searchRoutes);
  app.register(checkoutRoutes);
  app.register(webhookRoutes);
  app.register(orderRoutes);
  app.register(offersRoutes);
  app.register(purchasePolicyRoutes);
  app.register(sandboxRoutes);

  return app;
}
