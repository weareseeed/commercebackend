import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma, Agent, hashApiKey } from '@commercebackend/db';
import { AppError } from './error-handler';
import { env } from '../env';

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
  if (!operatorKey || Array.isArray(operatorKey) || operatorKey !== env.OPERATOR_API_KEY) {
    throw new AppError('UNAUTHORIZED', 'Valid X-Operator-Key header is required', 401);
  }
}

export function registerAuthPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('agent', undefined);
}
