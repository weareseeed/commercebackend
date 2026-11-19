import { describe, it, expect } from 'vitest';
import {
  mapListingToUcpProduct,
  mapUcpOrderCreateToCheckoutIntentInput,
  mapCheckoutIntentToUcpOrder,
  mapCheckoutStatusToUcpOrderStatus,
  UcpUnsupportedRequestError,
  type ListingLike,
  type CheckoutIntentLike,
  type UcpOrderCreateRequest,
} from './mappers';

describe('mapListingToUcpProduct', () => {
  it('maps an internal listing to a schema.org-style UCP product', () => {
    const listing: ListingLike = {
      id: 'lst_abc123',
      title: 'VIP Jazz Night Ticket',
      description: 'VIP ticket for Friday jazz night in Miami.',
      priceAmount: 8500,
      currency: 'USD',
    };

    expect(mapListingToUcpProduct(listing)).toEqual({
      id: 'lst_abc123',
      name: 'VIP Jazz Night Ticket',
      description: 'VIP ticket for Friday jazz night in Miami.',
      offers: [{ price: 8500, currency: 'USD' }],
    });
  });
});

describe('mapUcpOrderCreateToCheckoutIntentInput', () => {
  it('maps a single-line-item UCP order-create request to CreateCheckoutIntentInput', () => {
    const request: UcpOrderCreateRequest = {
      lineItems: [{ productId: 'lst_xyz789', quantity: 2 }],
      successUrl: 'https://example.test/success',
      cancelUrl: 'https://example.test/cancel',
    };

    expect(mapUcpOrderCreateToCheckoutIntentInput(request)).toEqual({
      listingId: 'lst_xyz789',
      quantity: 2,
      successUrl: 'https://example.test/success',
      cancelUrl: 'https://example.test/cancel',
      offerId: undefined,
    });
  });

  it('carries an offerId through when present', () => {
    const request: UcpOrderCreateRequest = {
      lineItems: [{ productId: 'lst_xyz789', quantity: 2 }],
      successUrl: 'https://example.test/success',
      cancelUrl: 'https://example.test/cancel',
      offerId: 'off_123',
    };

    const mapped = mapUcpOrderCreateToCheckoutIntentInput(request);
    expect(mapped.offerId).toBe('off_123');
  });

  it('sums quantities across repeated line items for the same product', () => {
    const request: UcpOrderCreateRequest = {
      lineItems: [
        { productId: 'lst_xyz789', quantity: 1 },
        { productId: 'lst_xyz789', quantity: 3 },
      ],
      successUrl: 'https://example.test/success',
      cancelUrl: 'https://example.test/cancel',
    };

    const mapped = mapUcpOrderCreateToCheckoutIntentInput(request);
    expect(mapped.listingId).toBe('lst_xyz789');
    expect(mapped.quantity).toBe(4);
  });

  it('rejects a request that references more than one distinct product with a clear error', () => {
    const request: UcpOrderCreateRequest = {
      lineItems: [
        { productId: 'lst_one', quantity: 1 },
        { productId: 'lst_two', quantity: 1 },
      ],
      successUrl: 'https://example.test/success',
      cancelUrl: 'https://example.test/cancel',
    };

    expect(() => mapUcpOrderCreateToCheckoutIntentInput(request)).toThrow(UcpUnsupportedRequestError);

    try {
      mapUcpOrderCreateToCheckoutIntentInput(request);
      expect.unreachable('expected mapUcpOrderCreateToCheckoutIntentInput to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(UcpUnsupportedRequestError);
      expect((err as UcpUnsupportedRequestError).code).toBe('UCP_MULTI_ITEM_UNSUPPORTED');
    }
  });
});

describe('mapCheckoutStatusToUcpOrderStatus', () => {
  it('maps every internal checkout intent status to a UCP order status', () => {
    expect(mapCheckoutStatusToUcpOrderStatus('open')).toBe('payment_pending');
    expect(mapCheckoutStatusToUcpOrderStatus('human_approval_required')).toBe('requires_human_review');
    expect(mapCheckoutStatusToUcpOrderStatus('human_approved')).toBe('payment_pending');
    expect(mapCheckoutStatusToUcpOrderStatus('human_rejected')).toBe('rejected');
    expect(mapCheckoutStatusToUcpOrderStatus('paid')).toBe('paid');
    expect(mapCheckoutStatusToUcpOrderStatus('expired')).toBe('expired');
    expect(mapCheckoutStatusToUcpOrderStatus('cancelled')).toBe('cancelled');
    expect(mapCheckoutStatusToUcpOrderStatus('failed')).toBe('failed');
    expect(mapCheckoutStatusToUcpOrderStatus('payment_inventory_conflict')).toBe('failed');
  });

  it('falls back to failed for an unrecognized status rather than throwing', () => {
    expect(mapCheckoutStatusToUcpOrderStatus('some_future_status')).toBe('failed');
  });
});

describe('mapCheckoutIntentToUcpOrder', () => {
  it('maps an internal checkout intent to a UCP order with id, status, line items, totals, and payment URL', () => {
    const intent: CheckoutIntentLike = {
      id: 'chk_123',
      listingId: 'lst_xyz789',
      buyerAgentId: 'agent_buyer',
      sellerAgentId: 'agent_seller',
      quantity: 2,
      amountTotal: 17000,
      currency: 'USD',
      status: 'open',
      checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_session_id_123',
    };

    expect(mapCheckoutIntentToUcpOrder(intent)).toEqual({
      id: 'chk_123',
      status: 'payment_pending',
      buyerId: 'agent_buyer',
      sellerId: 'agent_seller',
      lineItems: [{ productId: 'lst_xyz789', quantity: 2 }],
      totalPrice: { amount: 17000, currency: 'USD' },
      paymentUrl: 'https://checkout.stripe.com/pay/cs_test_session_id_123',
    });
  });

  it('maps a null checkoutUrl to a null paymentUrl (e.g. while human approval is pending)', () => {
    const intent: CheckoutIntentLike = {
      id: 'chk_456',
      listingId: 'lst_xyz789',
      buyerAgentId: 'agent_buyer',
      sellerAgentId: 'agent_seller',
      quantity: 1,
      amountTotal: 8500,
      currency: 'USD',
      status: 'human_approval_required',
      checkoutUrl: null,
    };

    const order = mapCheckoutIntentToUcpOrder(intent);
    expect(order.status).toBe('requires_human_review');
    expect(order.paymentUrl).toBeNull();
  });

  it('round-trips: mapping internal -> UCP order reconstructs the original values', () => {
    const original: CheckoutIntentLike = {
      id: 'chk_roundtrip',
      listingId: 'lst_roundtrip',
      buyerAgentId: 'agent_buyer_rt',
      sellerAgentId: 'agent_seller_rt',
      quantity: 3,
      amountTotal: 30000,
      currency: 'USD',
      status: 'paid',
      checkoutUrl: 'https://checkout.stripe.com/pay/cs_roundtrip',
    };

    const order = mapCheckoutIntentToUcpOrder(original);

    // The UCP-shaped order must let a caller reconstruct every original field.
    expect(order.id).toBe(original.id);
    expect(order.buyerId).toBe(original.buyerAgentId);
    expect(order.sellerId).toBe(original.sellerAgentId);
    expect(order.lineItems).toEqual([{ productId: original.listingId, quantity: original.quantity }]);
    expect(order.totalPrice).toEqual({ amount: original.amountTotal, currency: original.currency });
    expect(order.paymentUrl).toBe(original.checkoutUrl);
    expect(order.status).toBe(mapCheckoutStatusToUcpOrderStatus(original.status));

    // And an inbound request built from that reconstructed shape maps back
    // onto a CreateCheckoutIntentInput matching the original listing/quantity.
    const reconstructedRequest: UcpOrderCreateRequest = {
      lineItems: order.lineItems,
      successUrl: 'https://example.test/success',
      cancelUrl: 'https://example.test/cancel',
    };
    const reconstructedInput = mapUcpOrderCreateToCheckoutIntentInput(reconstructedRequest);
    expect(reconstructedInput.listingId).toBe(original.listingId);
    expect(reconstructedInput.quantity).toBe(original.quantity);
  });
});
