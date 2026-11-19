import { z } from 'zod';
import { ListingTypeSchema } from './listing';

export const PurchasePolicySchema = z.object({
  id: z.string(),
  buyerAgentId: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  maxAutoApproveAmount: z.number(),
  currency: z.string(),
  allowedListingTypes: z.array(z.string()),
  allowedSellerAgentIds: z.array(z.string()),
  requireHumanApprovalAboveAmount: z.number(),
  requireHumanApprovalForOffers: z.boolean(),
  spendingLimitAmount: z.number().nullable().optional(),
  spendingLimitPeriodDays: z.number().nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const CreatePurchasePolicySchema = z
  .object({
    name: z.string().min(1, 'Policy name is required'),
    enabled: z.boolean().default(true),
    maxAutoApproveAmount: z
      .number()
      .int()
      .nonnegative('Max auto-approve amount must be a non-negative integer in cents'),
    currency: z.string().default('USD'),
    allowedListingTypes: z.array(ListingTypeSchema).default([]),
    allowedSellerAgentIds: z.array(z.string().min(1)).default([]),
    requireHumanApprovalAboveAmount: z
      .number()
      .int()
      .nonnegative('Human approval threshold must be a non-negative integer in cents'),
    requireHumanApprovalForOffers: z.boolean().default(false),
    // Optional trailing-period spending budget, independent of the
    // per-checkout thresholds above. Leave both unset/null for no spending
    // limit (today's behavior). When set, this only powers a read-only
    // signal on checkout-intent creation — it never blocks checkout.
    spendingLimitAmount: z
      .number()
      .int()
      .nonnegative('Spending limit amount must be a non-negative integer in cents')
      .nullable()
      .optional(),
    spendingLimitPeriodDays: z
      .number()
      .int()
      .positive('Spending limit period must be a positive number of days')
      .nullable()
      .optional(),
  })
  .refine(
    (data) =>
      (data.spendingLimitAmount == null) === (data.spendingLimitPeriodDays == null),
    {
      message: 'spendingLimitAmount and spendingLimitPeriodDays must be set together',
      path: ['spendingLimitPeriodDays'],
    }
  );

export const CreatePurchasePolicyResponseSchema = z.object({
  purchasePolicy: PurchasePolicySchema,
});

export const ListPurchasePoliciesResponseSchema = z.object({
  purchasePolicies: z.array(PurchasePolicySchema),
});

export type CreatePurchasePolicyInput = z.infer<typeof CreatePurchasePolicySchema>;
export type PurchasePolicyResponse = z.infer<typeof PurchasePolicySchema>;
