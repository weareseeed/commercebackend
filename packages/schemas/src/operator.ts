import { z } from 'zod';

export const OperatorMetricsCountsSchema = z.object({
  agents: z.number(),
  listings: z.number(),
  offers: z.number(),
  checkoutIntents: z.number(),
  orders: z.number(),
  queryLogs: z.number(),
});

export const OperatorMetricsCriticalEventsSchema = z.object({
  total: z.number(),
  byCode: z.record(z.string(), z.number()),
});

export const OperatorMetricsPendingApprovalsSchema = z.object({
  count: z.number(),
  oldestRequestedAt: z.string().nullable(),
});

export const OperatorMetricsResponseSchema = z.object({
  generatedAt: z.string(),
  counts: OperatorMetricsCountsSchema,
  pendingApprovals: OperatorMetricsPendingApprovalsSchema,
  criticalEvents: OperatorMetricsCriticalEventsSchema,
});

export type OperatorMetricsCounts = z.infer<typeof OperatorMetricsCountsSchema>;
export type OperatorMetricsCriticalEvents = z.infer<typeof OperatorMetricsCriticalEventsSchema>;
export type OperatorMetricsPendingApprovals = z.infer<typeof OperatorMetricsPendingApprovalsSchema>;
export type OperatorMetricsResponse = z.infer<typeof OperatorMetricsResponseSchema>;
