#!/usr/bin/env node

const baseUrl = (process.env.API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const operatorKey = process.env.OPERATOR_API_KEY;

if (!operatorKey) {
  console.error('OPERATOR_API_KEY is required to run sandbox smoke tests.');
  process.exit(1);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const code = data?.error?.code || 'HTTP_ERROR';
    const message = data?.error?.message || `HTTP ${response.status}`;
    throw new Error(`${code}: ${message}`);
  }
  return data;
}

function authHeaders(apiKey) {
  return { authorization: `Bearer ${apiKey}` };
}

async function main() {
  console.log(`Sandbox smoke test target: ${baseUrl}`);

  const reset = await request('/v1/sandbox/reset', {
    method: 'POST',
    headers: { 'x-operator-key': operatorKey },
  });
  console.log('✓ reset sandbox fixtures');

  const { credentials, manifest } = reset;

  const health = await request('/health');
  const ready = await request('/ready');
  console.log(`✓ health ok (${health.mode}, stripe=${health.stripeMode})`);
  console.log(`✓ ready ok (database=${ready.checks.database}, stripe=${ready.checks.stripe})`);

  const publicListings = await request('/v1/public/listings');
  if (!Array.isArray(publicListings.listings) || publicListings.listings.length < 5) {
    throw new Error('Expected at least 5 public listings after reset');
  }
  console.log(`✓ public listings available (${publicListings.listings.length})`);

  const publicSearch = await request('/v1/public/search', {
    method: 'POST',
    body: JSON.stringify({ query: 'jazz miami', filters: { type: 'event_ticket', status: 'active' } }),
  });
  if (!publicSearch.results?.some((result) => result.listing.id === manifest.listingIds.vipTicket)) {
    throw new Error('Public search did not return the VIP ticket fixture');
  }
  console.log('✓ public search returns seeded fixture');

  const autoCheckout = await request('/v1/checkout-intents', {
    method: 'POST',
    headers: authHeaders(credentials.autoBuyerApiKey),
    body: JSON.stringify({
      listingId: manifest.listingIds.lowInventoryBundle,
      quantity: 1,
      successUrl: `${baseUrl}/docs/sandbox-success`,
      cancelUrl: `${baseUrl}/docs/sandbox-cancel`,
    }),
  });
  if (autoCheckout.checkoutIntent.status !== 'open' || autoCheckout.checkoutIntent.policyDecision !== 'policy_approved') {
    throw new Error('Auto-approved checkout did not stay open with a Stripe session');
  }
  console.log('✓ auto-approved checkout created');

  const autoPaid = await request(`/v1/sandbox/checkout-intents/${autoCheckout.checkoutIntent.id}/simulate-complete`, {
    method: 'POST',
    headers: { 'x-operator-key': operatorKey },
  });
  if (autoPaid.checkoutIntent.status !== 'paid' || autoPaid.listing.quantityAvailable !== 0) {
    throw new Error('Auto-approved completion did not create a paid order and exhaust inventory');
  }
  console.log('✓ auto-approved checkout completed and inventory decremented');

  const approvalCheckout = await request('/v1/checkout-intents', {
    method: 'POST',
    headers: authHeaders(credentials.approvalBuyerApiKey),
    body: JSON.stringify({
      listingId: manifest.listingIds.devkit,
      quantity: 1,
      successUrl: `${baseUrl}/docs/sandbox-success`,
      cancelUrl: `${baseUrl}/docs/sandbox-cancel`,
    }),
  });
  if (approvalCheckout.checkoutIntent.status !== 'human_approval_required') {
    throw new Error('Approval-required checkout did not stop for human approval');
  }
  console.log('✓ approval-required fixed-price checkout paused correctly');

  const approvedCheckout = await request(`/v1/checkout-intents/${approvalCheckout.checkoutIntent.id}/approve`, {
    method: 'POST',
    headers: { 'x-operator-key': operatorKey },
  });
  if (approvedCheckout.checkoutIntent.status !== 'human_approved') {
    throw new Error('Operator approval did not resume checkout');
  }
  console.log('✓ operator approval resumed fixed-price checkout');

  const approvedPaid = await request(`/v1/sandbox/checkout-intents/${approvalCheckout.checkoutIntent.id}/simulate-complete`, {
    method: 'POST',
    headers: { 'x-operator-key': operatorKey },
  });
  if (approvedPaid.checkoutIntent.status !== 'paid' || !approvedPaid.order?.id) {
    throw new Error('Approved fixed-price checkout did not create an order');
  }
  console.log('✓ approved fixed-price checkout completed');

  const offer = await request(`/v1/listings/${manifest.listingIds.negotiationWorkshop}/offers`, {
    method: 'POST',
    headers: authHeaders(credentials.approvalBuyerApiKey),
    body: JSON.stringify({
      priceAmount: 21000,
      quantity: 1,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      note: 'Sandbox smoke offer',
    }),
  });
  console.log('✓ offer created');

  const acceptedOffer = await request(`/v1/offers/${offer.offer.id}/accept`, {
    method: 'POST',
    headers: authHeaders(credentials.sellerApiKey),
  });
  if (acceptedOffer.offer.status !== 'accepted') {
    throw new Error('Seller did not accept the offer');
  }
  console.log('✓ offer accepted');

  const offerCheckout = await request('/v1/checkout-intents', {
    method: 'POST',
    headers: authHeaders(credentials.approvalBuyerApiKey),
    body: JSON.stringify({
      listingId: manifest.listingIds.negotiationWorkshop,
      offerId: acceptedOffer.offer.id,
      quantity: acceptedOffer.offer.acceptedQuantity,
      successUrl: `${baseUrl}/docs/sandbox-success`,
      cancelUrl: `${baseUrl}/docs/sandbox-cancel`,
    }),
  });
  if (offerCheckout.checkoutIntent.status !== 'human_approval_required') {
    throw new Error('Offer checkout should require human approval in sandbox');
  }
  console.log('✓ accepted-offer checkout requires approval');

  const approvedOfferCheckout = await request(`/v1/checkout-intents/${offerCheckout.checkoutIntent.id}/approve`, {
    method: 'POST',
    headers: { 'x-operator-key': operatorKey },
  });
  if (approvedOfferCheckout.checkoutIntent.status !== 'human_approved') {
    throw new Error('Operator approval did not resume offer checkout');
  }
  console.log('✓ operator approval resumed offer checkout');

  const paidOfferCheckout = await request(`/v1/sandbox/checkout-intents/${offerCheckout.checkoutIntent.id}/simulate-complete`, {
    method: 'POST',
    headers: { 'x-operator-key': operatorKey },
  });
  if (paidOfferCheckout.checkoutIntent.status !== 'paid' || paidOfferCheckout.order?.amountTotal !== acceptedOffer.offer.acceptedPriceAmount) {
    throw new Error('Offer checkout did not use accepted offer terms');
  }
  console.log('✓ accepted-offer checkout completed with accepted terms');

  console.log('\nSandbox smoke test passed.');
}

main().catch((error) => {
  console.error(`Sandbox smoke test failed: ${error.message}`);
  process.exit(1);
});
