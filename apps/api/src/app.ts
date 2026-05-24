import fastify from 'fastify';
import cors from '@fastify/cors';
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

export function buildApp() {
  const app = fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  // CORS Configuration
  app.register(cors, {
    origin: '*',
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

  return app;
}
