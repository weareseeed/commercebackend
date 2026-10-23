#!/usr/bin/env node

const baseUrl = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const operatorApiKey = process.env.OPERATOR_API_KEY || '';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.error?.message || `HTTP ${response.status}`;
    const code = data?.error?.code || 'UNKNOWN_ERROR';
    throw new Error(`${code}: ${message}`);
  }

  return data;
}

async function registerAgent(type, label) {
  return request('/v1/agents', {
    method: 'POST',
    body: JSON.stringify({
      name: `Example ${label} Agent`,
      type,
      ownerEmail: `${label.toLowerCase()}-negotiation-agent-${Date.now()}@example.com`,
    }),
  });
}

async function createListing(sellerApiKey) {
  return request('/v1/listings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sellerApiKey}` },
    body: JSON.stringify({
      title: 'Negotiable Jazz Night VIP Table',
      description: 'VIP table for four at Friday jazz night in Miami. Seller accepts offers.',
      type: 'event_ticket',
      priceAmount: 24000,
      currency: 'USD',
      quantityAvailable: 6,
      attributes: {
        event_date: '2027-03-12',
        start_time: '20:00',
        venue_city: 'Miami',
        age_minimum: 21,
      },
      fulfillmentInstructions: 'Email QR table pass after payment.',
    }),
  });
}

async function searchListings(buyerApiKey) {
  return request('/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerApiKey}` },
    body: JSON.stringify({
      query: 'jazz night VIP table',
      filters: { type: 'event_ticket', status: 'active' },
      limit: 5,
      offset: 0,
    }),
  });
}

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

async function createOffer(buyerApiKey, listingId) {
  return request(`/v1/listings/${listingId}/offers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerApiKey}` },
    body: JSON.stringify({
      priceAmount: 18000,
      quantity: 1,
      expiresAt: hoursFromNow(24),
      note: 'Buyer agent opening offer below asking price based on budget ceiling.',
    }),
  });
}

async function counterOffer(sellerApiKey, offerId) {
  return request(`/v1/offers/${offerId}/counter`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sellerApiKey}` },
    body: JSON.stringify({
      counterPriceAmount: 21000,
      counterQuantity: 1,
      counterExpiresAt: hoursFromNow(24),
      note: 'Seller agent counters above reserve price, same quantity.',
    }),
  });
}

async function acceptCounter(buyerApiKey, offerId) {
  return request(`/v1/offers/${offerId}/accept-counter`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerApiKey}` },
  });
}

async function createAutoApprovePolicy(buyerAgentId) {
  return request(`/v1/agents/${buyerAgentId}/purchase-policies`, {
    method: 'POST',
    headers: { 'X-Operator-Key': operatorApiKey },
    body: JSON.stringify({
      name: 'Negotiation example auto-approve policy',
      maxAutoApproveAmount: 50000,
      currency: 'USD',
      allowedListingTypes: ['event_ticket'],
      requireHumanApprovalAboveAmount: 50000,
      requireHumanApprovalForOffers: false,
    }),
  });
}

async function createCheckoutIntent(buyerApiKey, listingId, offerId, quantity) {
  return request('/v1/checkout-intents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerApiKey}` },
    body: JSON.stringify({
      listingId,
      offerId,
      quantity,
      successUrl: 'http://localhost:3000/success?checkout_intent_id={CHECKOUT_INTENT_ID}',
      cancelUrl: 'http://localhost:3000/cancel?checkout_intent_id={CHECKOUT_INTENT_ID}',
    }),
  });
}

async function simulateWebhook(stripeCheckoutSessionId, checkoutIntentId) {
  const response = await fetch(`${baseUrl}/v1/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'mock_sig_header',
    },
    body: JSON.stringify({
      id: `evt_negotiation_example_${Math.random().toString(36).slice(2, 8)}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: stripeCheckoutSessionId,
          payment_intent: 'pi_negotiation_example_mock',
          metadata: { checkoutIntentId },
        },
      },
    }),
  });

  return response;
}

async function main() {
  console.log(`CommerceBackend agent-to-agent negotiation flow: ${baseUrl}`);

  // 1. Register both sides of the negotiation.
  const sellerRegistration = await registerAgent('seller', 'Seller');
  const sellerApiKey = sellerRegistration.apiKey;
  console.log(`Registered seller agent (${sellerRegistration.agent.id}).`);

  const buyerRegistration = await registerAgent('buyer', 'Buyer');
  const buyerApiKey = buyerRegistration.apiKey;
  console.log(`Registered buyer agent (${buyerRegistration.agent.id}).`);

  // 2. Seller lists a listing open to offers.
  const listingResult = await createListing(sellerApiKey);
  const listing = listingResult.listing;
  console.log(`Seller listed: ${listing.title} (${listing.id}) at list price $${listing.priceAmount / 100}.`);

  // 3. Buyer discovers it via search.
  const search = await searchListings(buyerApiKey);
  const match = (search.results || []).find((r) => r.listing.id === listing.id) || (search.results || [])[0];
  if (!match) {
    throw new Error('Could not find the seeded listing via search.');
  }
  console.log(`Buyer found listing via search (score ${match.score}, reason: "${match.matchReason}").`);

  // 4. Buyer opens with an offer below list price.
  const offerResult = await createOffer(buyerApiKey, listing.id);
  const offer = offerResult.offer;
  console.log(`Buyer offered $${offer.priceAmount / 100} for quantity ${offer.quantity}.`);

  // 5. Seller counters above its reserve price.
  const counterResult = await counterOffer(sellerApiKey, offer.id);
  console.log(
    `Seller countered at $${counterResult.offer.counterPriceAmount / 100} for quantity ${counterResult.offer.counterQuantity}.`
  );

  // 6. Buyer accepts the counter-offer, locking in a negotiated, non-listed price.
  const acceptedResult = await acceptCounter(buyerApiKey, offer.id);
  const acceptedOffer = acceptedResult.offer;
  console.log(
    `Buyer accepted the counter-offer: negotiated price $${acceptedOffer.acceptedPriceAmount / 100} ` +
      `(list price was $${listing.priceAmount / 100}).`
  );

  // 7. Grant the buyer an auto-approve purchase policy so checkout can proceed
  // without a human-approval pause, if an operator key is available. Without
  // one, checkout intents default to `human_approval_required` (the secure
  // default) and this example stops after reporting that status.
  if (operatorApiKey) {
    await createAutoApprovePolicy(buyerRegistration.agent.id);
    console.log('Operator granted the buyer agent an auto-approve purchase policy for this example.');
  } else {
    console.log(
      'No OPERATOR_API_KEY set: skipping purchase-policy setup. The checkout intent below will likely ' +
        'require human approval instead of producing a Stripe session.'
    );
  }

  // 8. Buyer creates a checkout intent from the accepted (negotiated) offer,
  // not the listing's list price.
  const checkoutResult = await createCheckoutIntent(
    buyerApiKey,
    listing.id,
    offer.id,
    acceptedOffer.acceptedQuantity
  );
  const checkoutIntent = checkoutResult.checkoutIntent;
  console.log(
    `Checkout intent ${checkoutIntent.id} created: status=${checkoutIntent.status}, ` +
      `amountTotal=$${checkoutIntent.amountTotal / 100} (negotiated, not the $${
        (listing.priceAmount * acceptedOffer.acceptedQuantity) / 100
      } list-price total).`
  );

  if (checkoutIntent.status === 'human_approval_required') {
    console.log(
      '\nCheckout intent is awaiting human approval and has no Stripe session yet. ' +
        'Set OPERATOR_API_KEY so this example can grant an auto-approve policy, or approve it ' +
        `manually via POST /v1/checkout-intents/${checkoutIntent.id}/approve.`
    );
    return;
  }

  console.log(`Stripe checkout session: ${checkoutIntent.stripeCheckoutSessionId}`);
  console.log(`Stripe checkout URL: ${checkoutIntent.checkoutUrl}`);

  // 9. Optionally simulate payment confirmation end-to-end. This only
  // succeeds if the API process was started with BYPASS_STRIPE_SIGNATURE=true
  // (development-only; see .env.example), the same mechanism the repository's
  // own `pnpm selftest:mock` uses. Otherwise, complete payment via the Stripe
  // checkout URL above using a Stripe test card.
  const webhookResponse = await simulateWebhook(checkoutIntent.stripeCheckoutSessionId, checkoutIntent.id);

  if (!webhookResponse.ok) {
    console.log(
      '\nSkipped mock payment confirmation (the running API did not accept the mock Stripe signature). ' +
        'This is expected unless the server was started with BYPASS_STRIPE_SIGNATURE=true. ' +
        `Complete payment manually at: ${checkoutIntent.checkoutUrl}`
    );
    return;
  }

  console.log('Simulated Stripe webhook accepted: payment confirmed for the negotiated checkout.');

  const orders = await request('/v1/orders?role=buyer', {
    headers: { Authorization: `Bearer ${buyerApiKey}` },
  });
  const order = (orders.orders || []).find((o) => o.checkoutIntentId === checkoutIntent.id);

  if (!order) {
    throw new Error('Order was not found after simulated payment confirmation.');
  }

  console.log('\n=========================================');
  console.log('AGENT-TO-AGENT NEGOTIATION CHECKOUT COMPLETE');
  console.log('=========================================');
  console.log(`Order ID:          ${order.id}`);
  console.log(`Negotiated price:  $${acceptedOffer.acceptedPriceAmount / 100} (list price was $${listing.priceAmount / 100})`);
  console.log(`Order total:       $${order.amountTotal / 100}`);
  console.log(`Fulfillment status: ${order.fulfillmentStatus}`);
  console.log('=========================================\n');
}

main().catch((error) => {
  console.error('Agent negotiation flow failed:', error.message);
  console.error(
    'Check that the API is running (pnpm dev), the database is migrated, and OPERATOR_API_KEY is set ' +
      'if you want the full auto-approved checkout path.'
  );
  process.exit(1);
});
