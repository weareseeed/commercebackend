import { z } from 'zod';
import type { CreateCheckoutIntentInput } from '@commercebackend/schemas';

/**
 * "UCP" (Universal Commerce Protocol) here is CommerceBackend's own
 * vendor-neutral, schema.org-inspired commerce mapping layer. There is no
 * single canonical, widely-recognized external standard by this name that
 * this package implements or claims conformance to — see
 * `docs/api/protocol-ucp.md` for the exact supported subset and explicit
 * unsupported-fields list. This module only decouples CommerceBackend's
 * internal listing/checkout-intent model from that mapping shape; it must
 * not define CommerceBackend's internal data model.
 */

// ---------------------------------------------------------------------------
// Outbound: internal Listing -> UCP product
// ---------------------------------------------------------------------------

export interface ListingLike {
  id: string;
  title: string;
  description: string;
  priceAmount: number;
  currency: string;
}

export function mapListingToUcpProduct(listing: ListingLike) {
  return {
    id: listing.id,
    name: listing.title,
    description: listing.description,
    offers: [
      {
        price: listing.priceAmount,
        currency: listing.currency,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Inbound: UCP order-create request -> CreateCheckoutIntentInput
// ---------------------------------------------------------------------------
//
// CommerceBackend's internal checkout model supports exactly one listing per
// checkout intent (see `packages/schemas/src/checkout.ts`,
// `apps/api/src/services/checkout.service.ts`). A UCP order-create request
// that names more than one distinct product cannot be represented internally
// and is rejected rather than silently truncated or merged.

export const UcpOrderLineItemSchema = z.object({
  /** Internal CommerceBackend listing id this line item is for. */
  productId: z.string().min(1, 'productId is required'),
  quantity: z.number().int().positive('quantity must be a positive integer'),
});

export const UcpOrderCreateRequestSchema = z.object({
  lineItems: z.array(UcpOrderLineItemSchema).min(1, 'At least one line item is required'),
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
  /** Optional reference to a previously accepted CommerceBackend offer. */
  offerId: z.string().optional(),
});

export type UcpOrderLineItem = z.infer<typeof UcpOrderLineItemSchema>;
export type UcpOrderCreateRequest = z.infer<typeof UcpOrderCreateRequestSchema>;

/**
 * Raised when a UCP order-create request cannot be mapped onto
 * CommerceBackend's internal single-listing-per-checkout model. Route
 * handlers should turn this into a 400 response rather than truncating or
 * merging the request.
 */
export class UcpUnsupportedRequestError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'UcpUnsupportedRequestError';
    this.code = code;
  }
}

export function mapUcpOrderCreateToCheckoutIntentInput(
  request: UcpOrderCreateRequest
): CreateCheckoutIntentInput {
  const distinctProductIds = new Set(request.lineItems.map((item) => item.productId));

  if (distinctProductIds.size > 1) {
    throw new UcpUnsupportedRequestError(
      "CommerceBackend's checkout model supports exactly one listing per checkout intent. " +
        'This UCP order-create request references more than one distinct product, which is not supported.',
      'UCP_MULTI_ITEM_UNSUPPORTED'
    );
  }

  const [productId] = distinctProductIds;
  const quantity = request.lineItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    listingId: productId,
    quantity,
    successUrl: request.successUrl,
    cancelUrl: request.cancelUrl,
    offerId: request.offerId,
  };
}

// ---------------------------------------------------------------------------
// Outbound: internal CheckoutIntent -> UCP order
// ---------------------------------------------------------------------------
//
// This mapping is a read-only view over CommerceBackend's existing
// Stripe-hosted-checkout-URL redirect model. It does not add delegated or
// tokenized payment handoff, order update/cancel, multi-item carts, tax,
// discounts, or refunds — see `docs/api/protocol-ucp.md` for the full
// unsupported list.

export type UcpOrderStatus =
  | 'payment_pending'
  | 'requires_human_review'
  | 'rejected'
  | 'paid'
  | 'expired'
  | 'cancelled'
  | 'failed';

/**
 * Maps every internal `CheckoutIntentStatus` (see
 * `packages/schemas/src/checkout.ts`) onto a UCP order status. The mapping is
 * intentionally total (every internal status has an entry) so nothing is
 * silently dropped; `payment_inventory_conflict` — a rare race between a
 * completed Stripe payment and concurrently exhausted inventory — surfaces as
 * `failed` since it requires manual operator review today, not automatic
 * order fulfillment.
 */
const CHECKOUT_STATUS_TO_UCP_ORDER_STATUS: Record<string, UcpOrderStatus> = {
  open: 'payment_pending',
  human_approval_required: 'requires_human_review',
  human_approved: 'payment_pending',
  human_rejected: 'rejected',
  paid: 'paid',
  expired: 'expired',
  cancelled: 'cancelled',
  failed: 'failed',
  payment_inventory_conflict: 'failed',
};

export function mapCheckoutStatusToUcpOrderStatus(status: string): UcpOrderStatus {
  return CHECKOUT_STATUS_TO_UCP_ORDER_STATUS[status] ?? 'failed';
}

export interface CheckoutIntentLike {
  id: string;
  listingId: string;
  buyerAgentId: string;
  sellerAgentId: string;
  quantity: number;
  amountTotal: number;
  currency: string;
  status: string;
  checkoutUrl?: string | null;
}

export interface UcpOrder {
  id: string;
  status: UcpOrderStatus;
  buyerId: string;
  sellerId: string;
  lineItems: UcpOrderLineItem[];
  totalPrice: {
    amount: number;
    currency: string;
  };
  /**
   * The existing Stripe-hosted Checkout URL the buyer must complete payment
   * at, unchanged from the native checkout-intent flow. Null until a Stripe
   * Checkout session exists (e.g. while `status` is `requires_human_review`).
   */
  paymentUrl: string | null;
}

export function mapCheckoutIntentToUcpOrder(intent: CheckoutIntentLike): UcpOrder {
  return {
    id: intent.id,
    status: mapCheckoutStatusToUcpOrderStatus(intent.status),
    buyerId: intent.buyerAgentId,
    sellerId: intent.sellerAgentId,
    lineItems: [{ productId: intent.listingId, quantity: intent.quantity }],
    totalPrice: {
      amount: intent.amountTotal,
      currency: intent.currency,
    },
    paymentUrl: intent.checkoutUrl ?? null,
  };
}
