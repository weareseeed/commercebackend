import { prisma } from '@commercebackend/db';
import { OperatorMetricsResponse } from '@commercebackend/schemas';

// Known critical event codes surfaced individually in the metrics response.
// Extend this list as new codes are added (e.g. future webhook-delivery
// failures) alongside the writer that persists them.
const CRITICAL_EVENT_CODES = ['CHECKOUT_PERSISTENCE_FAILED', 'PAYMENT_INVENTORY_CONFLICT'] as const;

export class OperatorService {
  static async getMetrics(): Promise<OperatorMetricsResponse> {
    const [agents, listings, offers, checkoutIntents, orders, queryLogs, criticalEventsTotal, pendingApprovalIntents, ...codeCounts] =
      await Promise.all([
        prisma.agent.count(),
        prisma.listing.count(),
        prisma.offer.count(),
        prisma.checkoutIntent.count(),
        prisma.order.count({}),
        prisma.agentQueryLog.count(),
        prisma.criticalEvent.count(),
        prisma.checkoutIntent.findMany({ where: { status: 'human_approval_required' } }),
        ...CRITICAL_EVENT_CODES.map((code) => prisma.criticalEvent.count({ where: { code } })),
      ]);

    const byCode: Record<string, number> = {};
    CRITICAL_EVENT_CODES.forEach((code, index) => {
      byCode[code] = codeCounts[index];
    });

    const pendingRequestedAt = (pendingApprovalIntents as any[])
      .map((intent) => intent.approvalRequestedAt ?? intent.createdAt)
      .filter(Boolean)
      .map((value) => new Date(value).getTime());

    return {
      generatedAt: new Date().toISOString(),
      counts: {
        agents,
        listings,
        offers,
        checkoutIntents,
        orders,
        queryLogs,
      },
      pendingApprovals: {
        count: pendingApprovalIntents.length,
        oldestRequestedAt: pendingRequestedAt.length ? new Date(Math.min(...pendingRequestedAt)).toISOString() : null,
      },
      criticalEvents: {
        total: criticalEventsTotal,
        byCode,
      },
    };
  }
}
