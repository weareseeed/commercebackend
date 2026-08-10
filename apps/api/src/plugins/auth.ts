import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import { prisma, Agent, hashApiKey } from '@commercebackend/db';
import { AppError } from './error-handler';
import { env } from '../env';

// Length-safe, constant-time string comparison. Avoids leaking the operator
// key through response timing. Implemented locally so it does not depend on any
// module that tests mock.
function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

declare module 'fastify' {
  interface FastifyRequest {
    agent?: Agent;
  }
}

export async function authenticateAgent(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    throw new AppError('UNAUTHORIZED', 'Authorization header is missing', 401);
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw new AppError('UNAUTHORIZED', 'Invalid authorization format. Use Bearer <api_key>', 401);
  }

  const apiKey = parts[1];
  const apiKeyHash = hashApiKey(apiKey);

  const agent = await prisma.agent.findFirst({
    where: { apiKeyHash },
  });

  if (!agent) {
    throw new AppError('UNAUTHORIZED', 'Invalid API key', 401);
  }

  if (agent.status === 'disabled') {
    throw new AppError('AGENT_DISABLED', 'This agent has been disabled', 403);
  }

  const agentWithoutHash = { ...agent };
  delete (agentWithoutHash as any).apiKeyHash;
  request.agent = agentWithoutHash;
}

export async function authenticateOperator(request: FastifyRequest, reply: FastifyReply) {
  const operatorKey = request.headers['x-operator-key'];
  const expected = env.OPERATOR_API_KEY;
  // Constant-time comparison avoids leaking the key via response timing.
  if (!operatorKey || Array.isArray(operatorKey) || !expected || !constantTimeEquals(operatorKey, expected)) {
    throw new AppError('UNAUTHORIZED', 'Valid X-Operator-Key header is required', 401);
  }
}

export function registerAuthPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('agent', undefined);
}
