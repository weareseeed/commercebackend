import { z } from 'zod';

// Checkout event ledger (weekly backlog item 16): a read-only, operator-gated
// view of a single checkout intent's state transitions, synthesized from
// existing CheckoutIntent/Order/CriticalEvent fields. There is no dedicated
// append-only event table yet (see
// docs/product/agent-checkout-moltbook-insights.md for that forward-looking
// design) — this never mutates state and never changes checkout behavior.
export const CheckoutEventTypeSchema = z.enum([
  'created',
  'human_approval_requested',
  'human_approved',
  'human_rejected',
  'paid',
  'fulfillment_updated',
  'CHECKOUT_PERSISTENCE_FAILED',
]);

export const CheckoutEventSchema = z.object({
  type: CheckoutEventTypeSchema,
  occurredAt: z.string(),
  detail: z.record(z.string(), z.unknown()).optional(),
});

export const CheckoutEventLedgerResponseSchema = z.object({
  checkoutIntentId: z.string(),
  status: z.string(),
  events: z.array(CheckoutEventSchema),
});

export type CheckoutEventType = z.infer<typeof CheckoutEventTypeSchema>;
export type CheckoutEvent = z.infer<typeof CheckoutEventSchema>;
export type CheckoutEventLedgerResponse = z.infer<typeof CheckoutEventLedgerResponseSchema>;
