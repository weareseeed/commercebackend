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

export const OperatorMetricsResponseSchema = z.object({
  generatedAt: z.string(),
  counts: OperatorMetricsCountsSchema,
  criticalEvents: OperatorMetricsCriticalEventsSchema,
});

export type OperatorMetricsCounts = z.infer<typeof OperatorMetricsCountsSchema>;
export type OperatorMetricsCriticalEvents = z.infer<typeof OperatorMetricsCriticalEventsSchema>;
export type OperatorMetricsResponse = z.infer<typeof OperatorMetricsResponseSchema>;
