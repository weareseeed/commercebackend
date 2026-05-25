#!/usr/bin/env node

const baseUrl = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

async function registerBuyer() {
  return request('/v1/agents', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Example Buyer Agent',
      type: 'buyer',
      ownerEmail: `buyer-agent-${Date.now()}@example.com`,
    }),
  });
}

async function searchListings(apiKey) {
  return request('/v1/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query: 'jazz tickets in Miami',
      filters: {
        type: 'event_ticket',
        status: 'active',
      },
      limit: 5,
      offset: 0,
    }),
  });
}

async function createOffer(apiKey, listingId) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return request(`/v1/listings/${listingId}/offers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      priceAmount: 7500,
      quantity: 2,
      expiresAt,
      note: 'Buyer agent offer based on price ceiling and inventory match.',
    }),
  });
}

async function createCheckoutIntent(apiKey, listingId, offerId) {
  return request('/v1/checkout-intents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      listingId,
      offerId,
      quantity: 2,
      successUrl: 'http://localhost:3000/success?checkout_intent_id={CHECKOUT_INTENT_ID}',
      cancelUrl: 'http://localhost:3000/cancel?checkout_intent_id={CHECKOUT_INTENT_ID}',
    }),
  });
}

async function main() {
  console.log(`CommerceBackend agent buyer flow: ${baseUrl}`);

  const existingApiKey = process.env.BUYER_API_KEY;
  const apiKey = existingApiKey || (await registerBuyer()).apiKey;

  if (!existingApiKey) {
    console.log('Registered buyer agent. The raw API key was returned once and is intentionally not printed.');
  }

  const listingIdFromEnv = process.env.LISTING_ID;
  const acceptedOfferId = process.env.ACCEPTED_OFFER_ID;

  if (acceptedOfferId && listingIdFromEnv) {
    const checkout = await createCheckoutIntent(apiKey, listingIdFromEnv, acceptedOfferId);
    console.log('Checkout intent created for accepted offer:');
    console.log(JSON.stringify(checkout, null, 2));
    return;
  }

  const search = await searchListings(apiKey);
  const results = search.results || [];
  console.log(`Found ${results.length} matching listing(s).`);

  if (results.length === 0) {
    console.log('No listings found. Run pnpm db:seed or create a seller listing first.');
    return;
  }

  const match = results[0];
  const listing = match.listing;
  console.log(`Selected listing: ${listing.title} (${listing.id})`);
  console.log(`Match reason: ${match.matchReason}; score: ${match.score}`);

  const offer = await createOffer(apiKey, listing.id);
  console.log('Offer submitted:');
  console.log(JSON.stringify(offer, null, 2));

  console.log('\nNext step: a seller agent must accept or counter this offer.');
  console.log('After acceptance, rerun with:');
  console.log(
    `BUYER_API_KEY=<stored-key> LISTING_ID=${listing.id} ACCEPTED_OFFER_ID=${offer.offer.id} node examples/agent-buyer-flow/buyer-offer-flow.mjs`
  );
}

main().catch((error) => {
  console.error('Agent buyer flow failed:', error.message);
  console.error('Check that the API is running, the database is seeded, and credentials are configured for the mode you are testing.');
  process.exit(1);
});
