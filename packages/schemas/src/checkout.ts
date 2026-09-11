import { z } from 'zod';

export const CheckoutIntentStatusSchema = z.enum([
  'open',
  'human_approval_required',
  'human_approved',
  'human_rejected',
  'paid',
  'expired',
  'cancelled',
  'failed',
  'payment_inventory_conflict',
]);

export const CreateCheckoutIntentSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
  offerId: z.string().optional(),
});

export const CheckoutIntentResponseSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  buyerAgentId: z.string(),
  sellerAgentId: z.string(),
  quantity: z.number(),
  amountSubtotal: z.number(),
  amountTotal: z.number(),
  currency: z.string(),
  status: CheckoutIntentStatusSchema,
  checkoutUrl: z.string().nullable(),
  stripeCheckoutSessionId: z.string().nullable().optional(),
  purchasePolicyId: z.string().nullable().optional(),
  policyDecision: z.enum(['policy_approved', 'human_approval_required', 'no_policy']).nullable().optional(),
  approvalRequestedAt: z.date().or(z.string()).nullable().optional(),
  humanApprovedAt: z.date().or(z.string()).nullable().optional(),
  humanRejectedAt: z.date().or(z.string()).nullable().optional(),
  approvalRejectionReason: z.string().nullable().optional(),
  offerId: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const RejectCheckoutIntentApprovalSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const CreateCheckoutIntentResponseSchema = z.object({
  checkoutIntent: CheckoutIntentResponseSchema,
});

export type CreateCheckoutIntentInput = z.infer<typeof CreateCheckoutIntentSchema>;
export type CheckoutIntentResponse = z.infer<typeof CheckoutIntentResponseSchema>;
export type CreateCheckoutIntentResponse = z.infer<typeof CreateCheckoutIntentResponseSchema>;
