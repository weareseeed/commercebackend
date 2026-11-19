import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import { prisma, Agent, hashApiKey, hashApiKeyWithSalt, extractApiKeyId } from '@commercebackend/db';
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

// Verifies a bearer API key against either key format:
//  - new-format keys (`<prefix><keyId>.<secret>`): the public `keyId` looks
//    up the row, then the full key is re-hashed with that row's own
//    `apiKeySalt` and compared to `apiKeyHash`.
//  - legacy keys (no embedded id): hashed with the old shared salt and
//    looked up by `apiKeyHash` equality, same as before this migration.
// This keeps every API key issued before the per-record-salt change working
// with no backfill, while all new keys get a per-record salt.
async function lookupAgentByApiKey(apiKey: string): Promise<Agent | null> {
  const keyId = extractApiKeyId(apiKey);

  if (keyId) {
    const agent = await prisma.agent.findFirst({ where: { apiKeyId: keyId } });
    if (!agent || !agent.apiKeySalt) return null;
    const expectedHash = hashApiKeyWithSalt(apiKey, agent.apiKeySalt);
    return constantTimeEquals(expectedHash, agent.apiKeyHash) ? agent : null;
  }

  const apiKeyHash = hashApiKey(apiKey);
  return prisma.agent.findFirst({ where: { apiKeyHash } });
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
  const agent = await lookupAgentByApiKey(apiKey);

  if (!agent) {
    throw new AppError('UNAUTHORIZED', 'Invalid API key', 401);
  }

  if (agent.status === 'disabled') {
    throw new AppError('AGENT_DISABLED', 'This agent has been disabled', 403);
  }

  const agentWithoutHash = { ...agent };
  delete (agentWithoutHash as any).apiKeyHash;
  delete (agentWithoutHash as any).apiKeySalt;
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
