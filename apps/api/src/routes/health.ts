import { FastifyInstance } from 'fastify';
import { prisma } from '@commercebackend/db';
import { env } from '../env';

const isPlaceholder = (val: string) => {
  const v = val.toLowerCase();
  return (
    v.includes('placeholder') ||
    v.includes('mock') ||
    v.includes('your_') ||
    v.includes('sk_test_xxx') ||
    v.includes('whsec_xxx') ||
    v === 'sk_test_' ||
    v === 'whsec_'
  );
};

const getStripeMode = (secretKey: string | undefined) => {
  if (!secretKey) return 'missing';
  if (isPlaceholder(secretKey)) return 'mocked';
  if (secretKey.toLowerCase().startsWith('sk_test_')) return 'test';
  if (secretKey.toLowerCase().startsWith('sk_live_')) return 'live';
  return 'configured';
};

export async function healthRoutes(fastify: FastifyInstance) {
  // Liveness/readiness probes are polled frequently by the platform; never
  // rate-limit them.
  fastify.get('/health', { config: { rateLimit: false } }, async (request, reply) => {
    return {
      ok: true,
      service: 'commercebackend-api',
      version: '0.2.1',
      mode: env.SANDBOX_MODE ? 'sandbox' : env.NODE_ENV,
      stripeMode: getStripeMode(env.STRIPE_SECRET_KEY),
    };
  });

  fastify.get('/ready', { config: { rateLimit: false } }, async (request, reply) => {
    let dbStatus = 'ok';
    const stripeMode = getStripeMode(env.STRIPE_SECRET_KEY);
    let stripeStatus = stripeMode === 'missing' ? 'missing' : 'configured';

    // Verify Database
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      dbStatus = 'error';
    }

    // Verify Stripe
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
      stripeStatus = 'missing';
    } else if (env.NODE_ENV === 'test' || isPlaceholder(env.STRIPE_SECRET_KEY) || isPlaceholder(env.STRIPE_WEBHOOK_SECRET)) {
      stripeStatus = 'mocked';
    } else if (env.SANDBOX_MODE && stripeMode !== 'test') {
      stripeStatus = 'invalid';
    }

    const ok = dbStatus === 'ok' && stripeStatus !== 'invalid';

    if (!ok) {
      return reply.status(503).send({
        ok: false,
        mode: env.SANDBOX_MODE ? 'sandbox' : env.NODE_ENV,
        checks: {
          database: dbStatus,
          stripe: stripeStatus,
          stripeMode,
        },
      });
    }

    return {
      ok: true,
      mode: env.SANDBOX_MODE ? 'sandbox' : env.NODE_ENV,
      checks: {
        database: dbStatus,
        stripe: stripeStatus,
        stripeMode,
      },
    };
  });
}
