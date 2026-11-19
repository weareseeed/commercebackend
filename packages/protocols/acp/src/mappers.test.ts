import { describe, it, expect } from 'vitest';
import {
  mapListingToAcpCatalogItem,
  mapAcpCheckoutSessionCreateToCheckoutIntentInput,
  mapCheckoutIntentToAcpCheckoutSession,
  AcpMappingError,
  type CheckoutIntentLike,
} from './mappers';

describe('mapListingToAcpCatalogItem', () => {
  it('maps a listing to an ACP catalog item', () => {
    const catalogItem = mapListingToAcpCatalogItem({
      id: 'lst_abc123',
      title: 'VIP Jazz Night Ticket',
      description: 'VIP ticket for Friday jazz night in Miami.',
      priceAmount: 8500,
      currency: 'USD',
    });

    expect(catalogItem).toEqual({
      id: 'lst_abc123',
      title: 'VIP Jazz Night Ticket',
      description: 'VIP ticket for Friday jazz night in Miami.',
      price: { amount: 8500, currency: 'USD' },
    });
  });

  it('includes availability derived from quantityAvailable when provided', () => {
    const inStock = mapListingToAcpCatalogItem({
      id: 'lst_1',
      title: 'Widget',
      description: 'A widget.',
      priceAmount: 1000,
      currency: 'USD',
      quantityAvailable: 5,
    });
    expect(inStock.availability).toBe('in_stock');
    expect(inStock.quantity_available).toBe(5);

    const outOfStock = mapListingToAcpCatalogItem({
      id: 'lst_2',
      title: 'Widget',
      description: 'A widget.',
      priceAmount: 1000,
      currency: 'USD',
      quantityAvailable: 0,
    });
    expect(outOfStock.availability).toBe('out_of_stock');
  });

  it('does not break the existing exported shape when quantityAvailable is omitted', () => {
    const catalogItem = mapListingToAcpCatalogItem({
      id: 'lst_3',
      title: 'Widget',
      description: 'A widget.',
      priceAmount: 1000,
      currency: 'USD',
    });
    expect(Object.keys(catalogItem).sort()).toEqual(['description', 'id', 'price', 'title'].sort());
  });
});

describe('mapAcpCheckoutSessionCreateToCheckoutIntentInput', () => {
  it('maps a single-line-item ACP request to the internal checkout intent input shape', () => {
    const mapped = mapAcpCheckoutSessionCreateToCheckoutIntentInput({
      items: [{ id: 'lst_xyz789', quantity: 2 }],
      success_url: 'https://buyer.example.com/success',
      cancel_url: 'https://buyer.example.com/cancel',
    });

    expect(mapped).toEqual({
      listingId: 'lst_xyz789',
      quantity: 2,
      successUrl: 'https://buyer.example.com/success',
      cancelUrl: 'https://buyer.example.com/cancel',
    });
  });

  it('carries an offer_id extension field through as offerId', () => {
    const mapped = mapAcpCheckoutSessionCreateToCheckoutIntentInput({
      items: [{ id: 'lst_xyz789', quantity: 2 }],
      success_url: 'https://buyer.example.com/success',
      cancel_url: 'https://buyer.example.com/cancel',
      offer_id: 'off_123',
    });

    expect(mapped.offerId).toBe('off_123');
  });

  it('sums quantities for repeated line items referencing the same listing', () => {
    const mapped = mapAcpCheckoutSessionCreateToCheckoutIntentInput({
      items: [
        { id: 'lst_xyz789', quantity: 1 },
        { id: 'lst_xyz789', quantity: 2 },
      ],
      success_url: 'https://buyer.example.com/success',
      cancel_url: 'https://buyer.example.com/cancel',
    });

    expect(mapped.listingId).toBe('lst_xyz789');
    expect(mapped.quantity).toBe(3);
  });

  it('rejects requests with more than one distinct listing (multi-item carts are unsupported)', () => {
    expect(() =>
      mapAcpCheckoutSessionCreateToCheckoutIntentInput({
        items: [
          { id: 'lst_a', quantity: 1 },
          { id: 'lst_b', quantity: 1 },
        ],
        success_url: 'https://buyer.example.com/success',
        cancel_url: 'https://buyer.example.com/cancel',
      })
    ).toThrow(AcpMappingError);
  });

  it('rejects requests with no line items', () => {
    expect(() =>
      mapAcpCheckoutSessionCreateToCheckoutIntentInput({
        items: [],
        success_url: 'https://buyer.example.com/success',
        cancel_url: 'https://buyer.example.com/cancel',
      })
    ).toThrow(AcpMappingError);
  });
});

describe('mapCheckoutIntentToAcpCheckoutSession', () => {
  const baseIntent: CheckoutIntentLike = {
    id: 'chk_123',
    listingId: 'lst_xyz789',
    buyerAgentId: 'agent_buyer',
    sellerAgentId: 'agent_seller',
    quantity: 2,
    amountSubtotal: 17000,
    amountTotal: 17000,
    currency: 'USD',
    status: 'open',
    checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_session_id_123',
    createdAt: '2026-05-24T00:00:00.000Z',
    updatedAt: '2026-05-24T00:00:00.000Z',
  };

  it('maps an open checkout intent to a ready_for_payment ACP checkout session', () => {
    const session = mapCheckoutIntentToAcpCheckoutSession(baseIntent);

    expect(session.id).toBe('chk_123');
    expect(session.status).toBe('ready_for_payment');
    expect(session.line_items).toEqual([{ id: 'lst_xyz789', quantity: 2, amount_total: 17000 }]);
    expect(session.totals).toEqual({ subtotal: 17000, total: 17000, currency: 'USD' });
    expect(session.payment_provider).toEqual({
      type: 'commercebackend_stripe_hosted_redirect',
      checkout_url: 'https://checkout.stripe.com/pay/cs_test_session_id_123',
    });
    expect(session.buyer_agent_id).toBe('agent_buyer');
    expect(session.seller_agent_id).toBe('agent_seller');
    expect(session.commercebackend_status).toBe('open');
  });

  it.each([
    ['open', 'ready_for_payment'],
    ['human_approval_required', 'not_ready_for_payment'],
    ['human_approved', 'ready_for_payment'],
    ['human_rejected', 'canceled'],
    ['paid', 'completed'],
    ['expired', 'canceled'],
    ['cancelled', 'canceled'],
    ['failed', 'canceled'],
    ['payment_inventory_conflict', 'canceled'],
  ] as const)('maps internal status %s to ACP status %s', (internalStatus, acpStatus) => {
    const session = mapCheckoutIntentToAcpCheckoutSession({ ...baseIntent, status: internalStatus });
    expect(session.status).toBe(acpStatus);
    expect(session.commercebackend_status).toBe(internalStatus);
  });

  it('falls back to null checkout_url when none is set (e.g. human_approval_required)', () => {
    const session = mapCheckoutIntentToAcpCheckoutSession({
      ...baseIntent,
      status: 'human_approval_required',
      checkoutUrl: null,
    });
    expect(session.payment_provider.checkout_url).toBeNull();
  });

  it('accepts Date objects for createdAt/updatedAt and serializes them to ISO strings', () => {
    const session = mapCheckoutIntentToAcpCheckoutSession({
      ...baseIntent,
      createdAt: new Date('2026-05-24T00:00:00.000Z'),
      updatedAt: new Date('2026-05-24T01:00:00.000Z'),
    });
    expect(session.created_at).toBe('2026-05-24T00:00:00.000Z');
    expect(session.updated_at).toBe('2026-05-24T01:00:00.000Z');
  });

  it('round-trips: internal checkout intent -> ACP session -> original values reconstructable', () => {
    const internal: CheckoutIntentLike = {
      id: 'chk_roundtrip_1',
      listingId: 'lst_roundtrip_1',
      buyerAgentId: 'agent_buyer_rt',
      sellerAgentId: 'agent_seller_rt',
      quantity: 3,
      amountSubtotal: 12000,
      amountTotal: 12000,
      currency: 'USD',
      status: 'paid',
      checkoutUrl: 'https://checkout.stripe.com/pay/cs_roundtrip',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:05:00.000Z',
    };

    const session = mapCheckoutIntentToAcpCheckoutSession(internal);

    // The original internal fields must be fully reconstructable from the
    // ACP-shaped session — nothing is lost in translation.
    expect(session.id).toBe(internal.id);
    expect(session.line_items[0].id).toBe(internal.listingId);
    expect(session.line_items[0].quantity).toBe(internal.quantity);
    expect(session.line_items[0].amount_total).toBe(internal.amountTotal);
    expect(session.totals.subtotal).toBe(internal.amountSubtotal);
    expect(session.totals.total).toBe(internal.amountTotal);
    expect(session.totals.currency).toBe(internal.currency);
    expect(session.payment_provider.checkout_url).toBe(internal.checkoutUrl);
    expect(session.buyer_agent_id).toBe(internal.buyerAgentId);
    expect(session.seller_agent_id).toBe(internal.sellerAgentId);
    expect(session.commercebackend_status).toBe(internal.status);
    expect(session.created_at).toBe(internal.createdAt);
    expect(session.updated_at).toBe(internal.updatedAt);
  });
});
