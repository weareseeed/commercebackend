import fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyRawBody from 'fastify-raw-body';
import { env, isTest } from './env';
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
    // Behind a hosting proxy (Railway/Cloud Run/etc.) the socket peer is the
    // proxy, not the client. Trust X-Forwarded-For so `request.ip` is the real
    // client address — without this, per-IP rate limiting keys on the proxy hop
    // and never accumulates (i.e. does not actually limit anyone). A client can
    // still spoof XFF to evade limits; that is an accepted trade-off for a
    // test-mode sandbox. Locally / in tests there is no proxy, so this is a no-op.
    // Configurable via TRUST_PROXY (default on) for deployments with no
    // reverse proxy in front, where trusting XFF would be spoofable.
    trustProxy: env.TRUST_PROXY,
    // Cap request bodies to blunt abuse on a public endpoint (agent payloads
    // are small JSON documents). Oversized bodies are rejected with 413.
    bodyLimit: 65536, // 64 KB
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

  // CORS Configuration. Default '*' (public agent API); override with a
  // comma-separated CORS_ORIGIN allowlist for browser callers.
  const corsOrigin =
    env.CORS_ORIGIN === '*'
      ? '*'
      : env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  app.register(cors, {
    origin: corsOrigin,
  });

  // Per-IP rate limiting. Applied globally outside tests so authenticated
  // mutation routes are covered; individual routes may set tighter limits, and
  // health/webhook opt out. Disabled under test (NODE_ENV==='test' or a bare
  // vitest run) to keep the suite deterministic.
  app.register(rateLimit, {
    global: !isTest,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
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
