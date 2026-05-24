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

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    return {
      ok: true,
      service: 'commercebackend-api',
      version: '0.1.0',
    };
  });

  fastify.get('/ready', async (request, reply) => {
    let dbStatus = 'ok';
    let stripeStatus = 'configured';

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
    }

    const ok = dbStatus === 'ok';

    if (!ok) {
      return reply.status(503).send({
        ok: false,
        checks: {
          database: dbStatus,
          stripe: stripeStatus,
        },
      });
    }

    return {
      ok: true,
      checks: {
        database: dbStatus,
        stripe: stripeStatus,
      },
    };
  });
}
