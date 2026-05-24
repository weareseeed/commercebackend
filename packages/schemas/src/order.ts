import { z } from 'zod';

export const PaymentStatusSchema = z.enum(['paid', 'refunded', 'failed']);

export const FulfillmentStatusSchema = z.enum(['pending', 'processing', 'fulfilled', 'cancelled']);

export const OrderResponseSchema = z.object({
  id: z.string(),
  checkoutIntentId: z.string(),
  listingId: z.string(),
  buyerAgentId: z.string(),
  sellerAgentId: z.string(),
  quantity: z.number(),
  amountTotal: z.number(),
  currency: z.string(),
  paymentStatus: PaymentStatusSchema,
  fulfillmentStatus: FulfillmentStatusSchema,
  fulfillmentNote: z.string().nullable(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const OrdersListResponseSchema = z.object({
  orders: z.array(OrderResponseSchema),
});

export const OrderDetailsResponseSchema = z.object({
  order: OrderResponseSchema,
});

export const UpdateFulfillmentSchema = z.object({
  fulfillmentStatus: FulfillmentStatusSchema,
  fulfillmentNote: z.string().nullable().optional(),
});

export const UpdateFulfillmentResponseSchema = z.object({
  order: z.object({
    id: z.string(),
    fulfillmentStatus: FulfillmentStatusSchema,
    fulfillmentNote: z.string().nullable(),
  }),
});

export type OrderResponse = z.infer<typeof OrderResponseSchema>;
export type OrdersListResponse = z.infer<typeof OrdersListResponseSchema>;
export type OrderDetailsResponse = z.infer<typeof OrderDetailsResponseSchema>;
export type UpdateFulfillmentInput = z.infer<typeof UpdateFulfillmentSchema>;
export type UpdateFulfillmentResponse = z.infer<typeof UpdateFulfillmentResponseSchema>;
