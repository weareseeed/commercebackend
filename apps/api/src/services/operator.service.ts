import { prisma } from '@commercebackend/db';
import { OperatorMetricsResponse } from '@commercebackend/schemas';

// Known critical event codes surfaced individually in the metrics response.
// Extend this list as new codes are added (e.g. future webhook-delivery
// failures) alongside the writer that persists them.
const CRITICAL_EVENT_CODES = ['CHECKOUT_PERSISTENCE_FAILED'] as const;

export class OperatorService {
  static async getMetrics(): Promise<OperatorMetricsResponse> {
    const [agents, listings, offers, checkoutIntents, orders, queryLogs, criticalEventsTotal, ...codeCounts] =
      await Promise.all([
        prisma.agent.count(),
        prisma.listing.count(),
        prisma.offer.count(),
        prisma.checkoutIntent.count(),
        prisma.order.count({}),
        prisma.agentQueryLog.count(),
        prisma.criticalEvent.count(),
        ...CRITICAL_EVENT_CODES.map((code) => prisma.criticalEvent.count({ where: { code } })),
      ]);

    const byCode: Record<string, number> = {};
    CRITICAL_EVENT_CODES.forEach((code, index) => {
      byCode[code] = codeCounts[index];
    });

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
      criticalEvents: {
        total: criticalEventsTotal,
        byCode,
      },
    };
  }
}
