import { z } from 'zod';

export const OfferStatusSchema = z.enum([
  'pending',
  'accepted',
  'checkout_pending',
  'rejected',
  'countered',
  'expired',
  'cancelled',
]);

export const CreateOfferSchema = z.object({
  priceAmount: z.number().int().positive('Price amount must be a positive integer in cents'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  expiresAt: z.string().datetime({ message: 'expiresAt must be a valid UTC datetime string' }),
  note: z.string().max(500, 'Note cannot exceed 500 characters').optional(),
});

export const CreateCounterOfferSchema = z.object({
  counterPriceAmount: z.number().int().positive('Counter price must be a positive integer in cents'),
  counterQuantity: z.number().int().positive('Counter quantity must be a positive integer'),
  counterExpiresAt: z.string().datetime({ message: 'counterExpiresAt must be a valid UTC datetime string' }),
  note: z.string().max(500, 'Note cannot exceed 500 characters').optional(),
});

export const OfferHistoryResponseSchema = z.object({
  id: z.string(),
  offerId: z.string(),
  fromStatus: OfferStatusSchema.nullable(),
  toStatus: OfferStatusSchema,
  event: z.string(),
  actorId: z.string(),
  note: z.string().nullable(),
  metadata: z.any().nullable(),
  createdAt: z.date().or(z.string()),
});

export const OfferResponseSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  buyerAgentId: z.string(),
  priceAmount: z.number(),
  quantity: z.number(),
  status: OfferStatusSchema,
  expiresAt: z.date().or(z.string()),
  counterPriceAmount: z.number().nullable(),
  counterQuantity: z.number().nullable(),
  counterExpiresAt: z.date().or(z.string()).nullable(),
  acceptedPriceAmount: z.number().nullable(),
  acceptedQuantity: z.number().nullable(),
  acceptedAt: z.date().or(z.string()).nullable(),
  acceptedByAgentId: z.string().nullable(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  history: z.array(OfferHistoryResponseSchema).optional(),
});

export const CreateOfferResponseSchema = z.object({
  offer: OfferResponseSchema,
});

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
export type CreateCounterOfferInput = z.infer<typeof CreateCounterOfferSchema>;
export type OfferResponse = z.infer<typeof OfferResponseSchema>;
export type OfferHistoryResponse = z.infer<typeof OfferHistoryResponseSchema>;
export type CreateOfferResponse = z.infer<typeof CreateOfferResponseSchema>;
