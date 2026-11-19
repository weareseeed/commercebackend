import { prisma } from '@commercebackend/db';
import { CheckoutEvent, CheckoutEventLedgerResponse } from '@commercebackend/schemas';
import { AppError } from '../plugins/error-handler';

// Critical event codes that reference a checkout intent via
// `payload.checkoutIntentId`. Kept in sync with operator.service.ts.
const CHECKOUT_CRITICAL_EVENT_CODES = ['CHECKOUT_PERSISTENCE_FAILED'] as const;

function toIso(value: Date | string): string {
  return typeof value === 'string' ? value : value.toISOString();
}

export class CheckoutEventsService {
  // Synthesizes an ordered transition history for a single checkout intent
  // from existing fields/tables (weekly backlog item 16). There is no
  // dedicated append-only event table yet — see
  // docs/product/agent-checkout-moltbook-insights.md for that forward-looking
  // design — so this is read-only groundwork, not a persisted ledger. It
  // never mutates state or changes checkout behavior.
  static async getLedger(checkoutIntentId: string): Promise<CheckoutEventLedgerResponse> {
    const intent = await prisma.checkoutIntent.findUnique({ where: { id: checkoutIntentId } });
    if (!intent) {
      throw new AppError('CHECKOUT_INTENT_NOT_FOUND', 'Checkout intent not found', 404);
    }

    const [order, criticalEvents] = await Promise.all([
      prisma.order.findUnique({ where: { checkoutIntentId } }),
      prisma.criticalEvent.findMany({
        where: { code: { in: [...CHECKOUT_CRITICAL_EVENT_CODES] } },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const events: CheckoutEvent[] = [];

    events.push({
      type: 'created',
      occurredAt: toIso(intent.createdAt),
      detail: {
        listingId: intent.listingId,
        buyerAgentId: intent.buyerAgentId,
        sellerAgentId: intent.sellerAgentId,
        amountTotal: intent.amountTotal,
        currency: intent.currency,
      },
    });

    if (intent.approvalRequestedAt) {
      events.push({ type: 'human_approval_requested', occurredAt: toIso(intent.approvalRequestedAt) });
    }
    if (intent.humanApprovedAt) {
      events.push({ type: 'human_approved', occurredAt: toIso(intent.humanApprovedAt) });
    }
    if (intent.humanRejectedAt) {
      events.push({
        type: 'human_rejected',
        occurredAt: toIso(intent.humanRejectedAt),
        ...(intent.approvalRejectionReason ? { detail: { reason: intent.approvalRejectionReason } } : {}),
      });
    }

    if (order) {
      events.push({
        type: 'paid',
        occurredAt: toIso(order.createdAt),
        detail: { orderId: order.id, amountTotal: order.amountTotal, currency: order.currency },
      });

      // Fulfillment updates overwrite Order.fulfillmentStatus in place today
      // (no OrderHistory table exists), so only the *current* fulfillment
      // state is recoverable. This entry reflects latest-known state only,
      // not every intermediate transition.
      if (order.fulfillmentStatus !== 'pending' || order.fulfillmentNote) {
        events.push({
          type: 'fulfillment_updated',
          occurredAt: toIso(order.updatedAt),
          detail: {
            fulfillmentStatus: order.fulfillmentStatus,
            fulfillmentNote: order.fulfillmentNote ?? null,
            note: 'Reflects latest known fulfillment state only; intermediate transitions are not recorded yet.',
          },
        });
      }
    }

    for (const criticalEvent of criticalEvents) {
      const payload = (criticalEvent.payload ?? {}) as Record<string, unknown>;
      if (payload.checkoutIntentId !== checkoutIntentId) continue;
      events.push({
        type: criticalEvent.code as CheckoutEvent['type'],
        occurredAt: toIso(criticalEvent.createdAt),
        detail: payload,
      });
    }

    events.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

    return {
      checkoutIntentId: intent.id,
      status: intent.status,
      events,
    };
  }
}
