import { prisma, generateApiKey } from '@commercebackend/db';
import { CreateAgentInput } from '@commercebackend/schemas';
import { AppError } from '../plugins/error-handler';

export class AgentsService {
  static async createAgent(input: CreateAgentInput) {
    const prefix = process.env.NODE_ENV === 'production' ? 'cb_live_' : 'cb_test_';
    const { apiKey, apiKeyHash } = generateApiKey(prefix);

    const agent = await prisma.agent.create({
      data: {
        name: input.name,
        type: input.type,
        ownerEmail: input.ownerEmail,
        apiKeyHash,
        status: 'active',
      },
    });

    const agentWithoutHash = { ...agent };
    delete (agentWithoutHash as any).apiKeyHash;

    return {
      agent: agentWithoutHash,
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
    const agentWithoutHash = { ...agent };
    delete (agentWithoutHash as any).apiKeyHash;
    return agentWithoutHash;
  }
}
