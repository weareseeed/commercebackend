/**
 * ACP (Agentic Commerce Protocol) mapping layer.
 *
 * This module maps between CommerceBackend's internal listing/checkout-intent
 * model and an ACP-shaped subset used by `apps/api/src/routes/protocol-acp.ts`.
 *
 * IMPORTANT SCOPE NOTE: this is CommerceBackend's own scoped subset of the
 * public ACP spec (product feed + checkout sessions over a hosted Stripe
 * redirect), not a certified or full implementation. It does not implement
 * ACP's delegated payment token (`shared_payment_token`) / PSP handoff,
 * checkout session update or cancel, multi-item carts, tax, discounts, or
 * refunds. See `docs/api/protocol-acp.md` for the full list of unsupported
 * fields. This package must not define CommerceBackend's internal data model
 * — it only translates to/from it.
 */

// ---------------------------------------------------------------------------
// Outbound: internal Listing -> ACP catalog item (product feed)
// ---------------------------------------------------------------------------

export interface ListingLike {
  id: string;
  title: string;
  description: string;
  priceAmount: number;
  currency: string;
  status?: string;
  quantityAvailable?: number;
}

export function mapListingToAcpCatalogItem(listing: ListingLike) {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: {
      amount: listing.priceAmount,
      currency: listing.currency,
    },
    ...(listing.quantityAvailable !== undefined
      ? {
          availability: listing.quantityAvailable > 0 ? 'in_stock' : 'out_of_stock',
          quantity_available: listing.quantityAvailable,
        }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Inbound: ACP checkout-session-create request -> internal checkout intent input
// ---------------------------------------------------------------------------

/**
 * Thrown when an ACP checkout-session-create request uses a shape this
 * adapter does not support (e.g. more than one distinct listing per cart).
 * Callers (route handlers) are expected to translate this into a 400.
 */
export class AcpMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AcpMappingError';
  }
}

export interface AcpCheckoutSessionLineItem {
  id: string;
  quantity: number;
}

export interface AcpCheckoutSessionCreateRequest {
  items: AcpCheckoutSessionLineItem[];
  success_url: string;
  cancel_url: string;
  /**
   * Extension: references a pre-negotiated, already-accepted CommerceBackend
   * offer for this listing. Not part of the public ACP spec, which has no
   * offer-negotiation concept.
   */
  offer_id?: string;
}

/**
 * The internal model is single-listing-per-checkout. This mirrors
 * `CreateCheckoutIntentInput` from `@commercebackend/schemas` in shape, but is
 * declared independently here to keep this package decoupled from the
 * internal schema package.
 */
export interface MappedCheckoutIntentInput {
  listingId: string;
  quantity: number;
  successUrl: string;
  cancelUrl: string;
  offerId?: string;
}

export function mapAcpCheckoutSessionCreateToCheckoutIntentInput(
  request: AcpCheckoutSessionCreateRequest
): MappedCheckoutIntentInput {
  if (!request.items || request.items.length === 0) {
    throw new AcpMappingError('At least one line item is required.');
  }

  const distinctListingIds = new Set(request.items.map((item) => item.id));
  if (distinctListingIds.size > 1) {
    throw new AcpMappingError(
      'CommerceBackend\'s ACP adapter supports exactly one listing per checkout session. ' +
        'Multi-item carts are not supported; submit a separate checkout session per listing.'
    );
  }

  const [{ id: listingId }] = request.items;
  const quantity = request.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    listingId,
    quantity,
    successUrl: request.success_url,
    cancelUrl: request.cancel_url,
    ...(request.offer_id ? { offerId: request.offer_id } : {}),
  };
}

// ---------------------------------------------------------------------------
// Outbound: internal CheckoutIntent -> ACP checkout session
// ---------------------------------------------------------------------------

export type AcpCheckoutSessionStatus =
  | 'not_ready_for_payment'
  | 'ready_for_payment'
  | 'completed'
  | 'canceled';

/**
 * Best-effort mapping of CommerceBackend's internal checkout intent status
 * enum onto ACP's coarser checkout-session status vocabulary. The original
 * internal status is always preserved on the mapped object under
 * `commercebackend_status` so nothing is lost in translation.
 */
const STATUS_TO_ACP: Record<string, AcpCheckoutSessionStatus> = {
  open: 'ready_for_payment',
  human_approval_required: 'not_ready_for_payment',
  human_approved: 'ready_for_payment',
  human_rejected: 'canceled',
  paid: 'completed',
  expired: 'canceled',
  cancelled: 'canceled',
  failed: 'canceled',
  payment_inventory_conflict: 'canceled',
};

export interface CheckoutIntentLike {
  id: string;
  listingId: string;
  buyerAgentId: string;
  sellerAgentId: string;
  quantity: number;
  amountSubtotal: number;
  amountTotal: number;
  currency: string;
  status: string;
  checkoutUrl?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

function toIsoString(value: string | Date): string {
  return typeof value === 'string' ? value : value.toISOString();
}

export function mapCheckoutIntentToAcpCheckoutSession(intent: CheckoutIntentLike) {
  return {
    id: intent.id,
    status: STATUS_TO_ACP[intent.status] ?? 'not_ready_for_payment',
    line_items: [
      {
        id: intent.listingId,
        quantity: intent.quantity,
        amount_total: intent.amountTotal,
      },
    ],
    totals: {
      subtotal: intent.amountSubtotal,
      total: intent.amountTotal,
      currency: intent.currency,
    },
    // CommerceBackend does not support ACP's `shared_payment_token` /
    // delegated-PSP-handoff flow. Every ACP checkout session is backed by
    // CommerceBackend's existing Stripe-hosted checkout redirect, exactly as
    // it already works for native checkout intents.
    payment_provider: {
      type: 'commercebackend_stripe_hosted_redirect',
      checkout_url: intent.checkoutUrl ?? null,
    },
    buyer_agent_id: intent.buyerAgentId,
    seller_agent_id: intent.sellerAgentId,
    // Not part of the ACP spec; preserved so no information is lost when the
    // coarser ACP status vocabulary can't fully represent internal state
    // (e.g. `human_approval_required`).
    commercebackend_status: intent.status,
    created_at: toIsoString(intent.createdAt),
    updated_at: toIsoString(intent.updatedAt),
  };
}
