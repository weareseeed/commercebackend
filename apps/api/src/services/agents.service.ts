import { prisma, generateApiKey } from '@commercebackend/db';
import { AgentReputation, CreateAgentInput } from '@commercebackend/schemas';
import { AppError } from '../plugins/error-handler';

function redactApiKeyFields<T extends { apiKeyHash?: unknown; apiKeySalt?: unknown }>(
  agent: T
): Omit<T, 'apiKeyHash' | 'apiKeySalt'> {
  const redacted = { ...agent };
  delete (redacted as any).apiKeyHash;
  delete (redacted as any).apiKeySalt;
  return redacted;
}

// A checkout intent never produces an Order row unless it reaches `paid`
// (see Order.checkoutIntentId @unique), so "completed vs. failed checkouts"
// reads from CheckoutIntent.status directly rather than Order.
const FAILED_CHECKOUT_STATUSES = ['expired', 'cancelled', 'failed', 'payment_inventory_conflict'] as const;
// `checkout_pending` is the transient lock right after acceptance (see
// checkout.service.ts); it only exists downstream of an offer being
// accepted, so it counts as "accepted" for the reputation signal same as
// `accepted` itself.
const ACCEPTED_OFFER_STATUSES = ['accepted', 'checkout_pending'] as const;
const TERMINAL_OFFER_STATUSES = [...ACCEPTED_OFFER_STATUSES, 'rejected', 'expired', 'cancelled'] as const;

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
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

  /**
   * The public profile of another agent, e.g. for a buyer checking a
   * seller's reputation before making an offer. Omits `ownerEmail` (only the
   * owning agent sees that, via `GET /v1/agents/me`) in addition to the
   * usual API-key field redaction.
   */
  static async getAgentById(id: string) {
    const agent = await prisma.agent.findUnique({
      where: { id },
    });
    if (!agent) {
      throw new AppError('AGENT_NOT_FOUND', 'Agent not found', 404);
    }
    const redacted: any = redactApiKeyFields(agent);
    delete redacted.ownerEmail;
    delete redacted.apiKeyId;
    return {
      ...redacted,
      reputation: await AgentsService.getReputation(id),
    };
  }

  /**
   * Computes a per-agent reputation summary (weekly backlog item 11):
   * completed vs. failed checkouts and offer acceptance rate, split by the
   * agent's buyer and seller roles since the two are tracked independently
   * in the schema (an Offer only carries `buyerAgentId`; its seller side is
   * reached via `listing.sellerAgentId`). Groundwork for a future
   * purchase-policy trust check, not itself an enforcement decision.
   */
  static async getReputation(agentId: string): Promise<AgentReputation> {
    const [
      checkoutsCompletedAsBuyer,
      checkoutsFailedAsBuyer,
      checkoutsCompletedAsSeller,
      checkoutsFailedAsSeller,
      offersAcceptedAsBuyer,
      offersTerminalAsBuyer,
      offersAcceptedAsSeller,
      offersTerminalAsSeller,
    ] = await Promise.all([
      prisma.checkoutIntent.count({ where: { buyerAgentId: agentId, status: 'paid' } }),
      prisma.checkoutIntent.count({ where: { buyerAgentId: agentId, status: { in: [...FAILED_CHECKOUT_STATUSES] } } }),
      prisma.checkoutIntent.count({ where: { sellerAgentId: agentId, status: 'paid' } }),
      prisma.checkoutIntent.count({ where: { sellerAgentId: agentId, status: { in: [...FAILED_CHECKOUT_STATUSES] } } }),
      prisma.offer.count({ where: { buyerAgentId: agentId, status: { in: [...ACCEPTED_OFFER_STATUSES] } } }),
      prisma.offer.count({ where: { buyerAgentId: agentId, status: { in: [...TERMINAL_OFFER_STATUSES] } } }),
      prisma.offer.count({
        where: { listing: { sellerAgentId: agentId }, status: { in: [...ACCEPTED_OFFER_STATUSES] } },
      }),
      prisma.offer.count({
        where: { listing: { sellerAgentId: agentId }, status: { in: [...TERMINAL_OFFER_STATUSES] } },
      }),
    ]);

    return {
      checkouts: {
        asBuyer: {
          completed: checkoutsCompletedAsBuyer,
          failed: checkoutsFailedAsBuyer,
          completionRate: rate(checkoutsCompletedAsBuyer, checkoutsCompletedAsBuyer + checkoutsFailedAsBuyer),
        },
        asSeller: {
          completed: checkoutsCompletedAsSeller,
          failed: checkoutsFailedAsSeller,
          completionRate: rate(checkoutsCompletedAsSeller, checkoutsCompletedAsSeller + checkoutsFailedAsSeller),
        },
      },
      offers: {
        asBuyer: {
          accepted: offersAcceptedAsBuyer,
          terminalTotal: offersTerminalAsBuyer,
          acceptanceRate: rate(offersAcceptedAsBuyer, offersTerminalAsBuyer),
        },
        asSeller: {
          accepted: offersAcceptedAsSeller,
          terminalTotal: offersTerminalAsSeller,
          acceptanceRate: rate(offersAcceptedAsSeller, offersTerminalAsSeller),
        },
      },
    };
  }
}
