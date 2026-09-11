import { z } from 'zod';

export const ListingTypeSchema = z.enum([
  'physical_good',
  'digital_good',
  'event_ticket',
  'service',
  'other',
]);

export const ListingStatusSchema = z.enum(['active', 'paused', 'sold_out', 'deleted']);

export const CreateListingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  type: ListingTypeSchema,
  priceAmount: z.number().int().min(0, 'Price must be a non-negative integer in cents'),
  currency: z.string().default('USD'),
  quantityAvailable: z.number().int().nonnegative('Quantity available cannot be negative'),
  attributes: z.record(z.any()).default({}),
  fulfillmentInstructions: z.string().nullable().optional().default(null),
});

export const UpdateListingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: ListingStatusSchema.optional(),
  priceAmount: z.number().int().min(0, 'Price must be a non-negative integer in cents').optional(),
  quantityAvailable: z
    .number()
    .int()
    .nonnegative('Quantity available cannot be negative')
    .optional(),
  attributes: z.record(z.any()).optional(),
  fulfillmentInstructions: z.string().nullable().optional(),
});

export const ListingResponseSchema = z.object({
  id: z.string(),
  sellerAgentId: z.string(),
  title: z.string(),
  description: z.string(),
  type: ListingTypeSchema,
  status: ListingStatusSchema,
  priceAmount: z.number(),
  currency: z.string(),
  quantityAvailable: z.number(),
  attributes: z.any(),
  fulfillmentInstructions: z.string().nullable(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export const GetListingResponseSchema = z.object({
  listing: ListingResponseSchema,
});

export const CreateListingResponseSchema = z.object({
  listing: ListingResponseSchema,
});

export const SearchFiltersSchema = z.object({
  type: ListingTypeSchema.optional(),
  currency: z.string().optional(),
  maxPriceAmount: z.number().int().positive().optional(),
  status: ListingStatusSchema.default('active'),
});

export const SearchListingsRequestSchema = z.object({
  query: z.string().default(''),
  filters: SearchFiltersSchema.default({ status: 'active' }),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

export const SearchListingResultSchema = z.object({
  listing: ListingResponseSchema,
  matchReason: z.string(),
  score: z.number(),
});

export const SearchListingsResponseSchema = z.object({
  results: z.array(SearchListingResultSchema),
});

export type CreateListingInput = z.infer<typeof CreateListingSchema>;
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>;
export type ListingResponse = z.infer<typeof ListingResponseSchema>;
export type GetListingResponse = z.infer<typeof GetListingResponseSchema>;
export type CreateListingResponse = z.infer<typeof CreateListingResponseSchema>;
export type SearchListingsRequest = z.infer<typeof SearchListingsRequestSchema>;
export type SearchListingsResponse = z.infer<typeof SearchListingsResponseSchema>;
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
