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
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const CreatePurchasePolicySchema = z.object({
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
});

export const CreatePurchasePolicyResponseSchema = z.object({
  purchasePolicy: PurchasePolicySchema,
});

export const ListPurchasePoliciesResponseSchema = z.object({
  purchasePolicies: z.array(PurchasePolicySchema),
});

export type CreatePurchasePolicyInput = z.infer<typeof CreatePurchasePolicySchema>;
export type PurchasePolicyResponse = z.infer<typeof PurchasePolicySchema>;
