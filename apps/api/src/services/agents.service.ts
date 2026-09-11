import { prisma, generateApiKey } from '@commercebackend/db';
import { CreateAgentInput } from '@commercebackend/schemas';
import { AppError } from '../plugins/error-handler';

function redactApiKeyFields<T extends { apiKeyHash?: unknown; apiKeySalt?: unknown }>(
  agent: T
): Omit<T, 'apiKeyHash' | 'apiKeySalt'> {
  const redacted = { ...agent };
  delete (redacted as any).apiKeyHash;
  delete (redacted as any).apiKeySalt;
  return redacted;
}

export class AgentsService {
  static async createAgent(input: CreateAgentInput) {
    const prefix = process.env.NODE_ENV === 'production' ? 'cb_live_' : 'cb_test_';
    const { apiKey, apiKeyHash, apiKeySalt, apiKeyId } = generateApiKey(prefix);

    const agent = await prisma.agent.create({
      data: {
        name: input.name,
        type: input.type,
        ownerEmail: input.ownerEmail,
        apiKeyHash,
        apiKeySalt,
        apiKeyId,
        status: 'active',
      },
    });

    return {
      agent: redactApiKeyFields(agent),
      apiKey,
    };
  }

  static async getAgentById(id: string) {
    const agent = await prisma.agent.findUnique({
      where: { id },
    });
    if (!agent) {
      throw new AppError('AGENT_NOT_FOUND', 'Agent not found', 404);
    }
    return redactApiKeyFields(agent);
  }
}
