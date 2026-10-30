#!/usr/bin/env node

const baseUrl = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

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

async function registerAgent(name, type, ownerEmailPrefix) {
  return request('/v1/agents', {
    method: 'POST',
    body: JSON.stringify({
      name,
      type,
      ownerEmail: `${ownerEmailPrefix}-${Date.now()}@example.com`,
    }),
  });
}

async function createListing(sellerApiKey) {
  return request('/v1/listings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sellerApiKey}` },
    body: JSON.stringify({
      title: 'VIP Jazz Night Ticket (negotiable)',
      description: 'VIP ticket for Friday jazz night in Miami. Seller considers reasonable offers.',
      type: 'event_ticket',
      priceAmount: 10000,
      currency: 'USD',
      quantityAvailable: 10,
      attributes: {
        event_date: '2026-06-12',
        start_time: '20:00',
        venue_city: 'Miami',
      },
      fulfillmentInstructions: 'Email QR ticket after payment.',
    }),
  });
}

async function createOffer(buyerApiKey, listingId) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return request(`/v1/listings/${listingId}/offers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerApiKey}` },
    body: JSON.stringify({
      priceAmount: 7000,
      quantity: 2,
      expiresAt,
      note: 'Opening offer based on buyer price ceiling.',
    }),
  });
}

async function counterOffer(sellerApiKey, offerId) {
  const counterExpiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

  return request(`/v1/offers/${offerId}/counter`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sellerApiKey}` },
    body: JSON.stringify({
      counterPriceAmount: 8500,
      counterQuantity: 2,
      counterExpiresAt,
      note: 'Countering above cost floor.',
    }),
  });
}

async function acceptCounter(buyerApiKey, offerId) {
  return request(`/v1/offers/${offerId}/accept-counter`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerApiKey}` },
  });
}

async function createCheckoutIntent(buyerApiKey, listingId, acceptedOffer) {
  return request('/v1/checkout-intents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerApiKey}` },
    body: JSON.stringify({
      listingId,
      offerId: acceptedOffer.id,
      quantity: acceptedOffer.acceptedQuantity,
      successUrl: 'http://localhost:3000/success?checkout_intent_id={CHECKOUT_INTENT_ID}',
      cancelUrl: 'http://localhost:3000/cancel?checkout_intent_id={CHECKOUT_INTENT_ID}',
    }),
  });
}

async function main() {
  console.log(`CommerceBackend agent negotiation flow: ${baseUrl}\n`);

  console.log('1. Registering seller agent...');
  const sellerRegistration = await registerAgent(
    'Example Negotiation Seller Agent',
    'seller',
    'negotiation-seller-agent'
  );
  const sellerApiKey = sellerRegistration.apiKey;

  console.log('2. Seller creating a listing...');
  const { listing } = await createListing(sellerApiKey);
  console.log(`   Listing: ${listing.title} (${listing.id}), list price $${listing.priceAmount / 100}`);

  console.log('3. Registering buyer agent...');
  const buyerRegistration = await registerAgent(
    'Example Negotiation Buyer Agent',
    'buyer',
    'negotiation-buyer-agent'
  );
  const buyerApiKey = buyerRegistration.apiKey;

  console.log('4. Buyer submitting an opening offer below list price...');
  const { offer } = await createOffer(buyerApiKey, listing.id);
  console.log(`   Offer ${offer.id}: $${offer.priceAmount / 100} x ${offer.quantity} (status: ${offer.status})`);

  console.log('5. Seller countering the offer...');
  const counterResult = await counterOffer(sellerApiKey, offer.id);
  const countered = counterResult.offer;
  console.log(
    `   Counter: $${countered.counterPriceAmount / 100} x ${countered.counterQuantity} (status: ${countered.status})`
  );

  console.log('6. Buyer accepting the counteroffer...');
  const acceptedResult = await acceptCounter(buyerApiKey, offer.id);
  const accepted = acceptedResult.offer;
  console.log(
    `   Accepted: $${accepted.acceptedPriceAmount / 100} x ${accepted.acceptedQuantity} (status: ${accepted.status})`
  );

  console.log('7. Buyer creating a checkout intent from the negotiated (non-listed-price) offer...');
  const { checkoutIntent } = await createCheckoutIntent(buyerApiKey, listing.id, accepted);

  console.log('\n=========================================');
  console.log('NEGOTIATION FLOW COMPLETE');
  console.log('=========================================');
  console.log(`Listing price:       $${listing.priceAmount / 100}`);
  console.log(
    `Negotiated price:    $${accepted.acceptedPriceAmount / 100} (saved $${
      (listing.priceAmount - accepted.acceptedPriceAmount) / 100
    } off list, per unit)`
  );
  console.log(`Checkout Intent ID:  ${checkoutIntent.id}`);
  console.log(`Checkout status:     ${checkoutIntent.status}`);
  console.log(`Policy decision:     ${checkoutIntent.policyDecision}`);

  if (checkoutIntent.checkoutUrl) {
    console.log(`Checkout URL:        ${checkoutIntent.checkoutUrl}`);
  } else if (checkoutIntent.status === 'human_approval_required') {
    console.log(
      '  [INFO] No purchase policy auto-approved this checkout, so it is waiting on operator/human approval'
    );
    console.log('  [INFO] (secure default) and no Stripe session has been created yet.');
  }
  console.log('=========================================\n');
}

main().catch((error) => {
  console.error('Agent negotiation flow failed:', error.message);
  console.error(
    'Check that the API is running, the database is migrated/seeded, and the sandbox is reachable at API_BASE_URL.'
  );
  process.exit(1);
});
