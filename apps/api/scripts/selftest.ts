import { buildApp } from '../src/app';
import { prisma } from '@commercebackend/db';

const PORT = 4001;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Read self-test mode from args
const mode = process.argv.includes('--stripe')
  ? 'stripe'
  : process.argv.includes('--square')
    ? 'square'
    : process.argv.includes('--shopify')
      ? 'shopify'
      : process.argv.includes('--bigcommerce')
        ? 'bigcommerce'
        : 'mock';

async function run() {
  console.log(`Starting CommerceBackend self-test in [${mode.toUpperCase()}] mode...\n`);

  // Ensure DB can be connected to
  try {
    await prisma.$connect();
  } catch (err: any) {
    console.error(
      '❌ Failed to connect to database. Make sure DATABASE_URL is set and DB is running.'
    );
    process.exit(1);
  }

  // Set env bypass flag for webhook signature checking in mock mode
  if (mode === 'mock') {
    process.env.BYPASS_STRIPE_SIGNATURE = 'true';
  }

  // Boot the Fastify server
  const app = buildApp();
  try {
    await app.listen({ port: PORT, host: '127.0.0.1' });
    console.log(`[OK] Server listening at ${BASE_URL}`);
  } catch (err: any) {
    console.error('❌ Failed to start Fastify server:', err.message);
    process.exit(1);
  }

  const results: { name: string; status: 'PASS' | 'FAIL'; message?: string }[] = [];

  const testStep = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
      console.log(`[PASS] ${name}`);
    } catch (err: any) {
      results.push({ name, status: 'FAIL', message: err.message });
      console.log(`[FAIL] ${name}: ${err.message}`);
    }
  };

  let sellerKey = '';
  let buyerKey = '';
  let listingId = '';
  let checkoutIntentId = '';
  let stripeSessionId = '';
  let orderId = '';

  // 1. Health check
  await testStep('health check', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const body = await res.json();
    if (!body.ok || !body.version) {
      throw new Error(`Invalid body: ${JSON.stringify(body)}`);
    }
  });

  // 2. Readiness check
  await testStep('readiness check', async () => {
    const res = await fetch(`${BASE_URL}/ready`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const body = await res.json();
    if (!body.ok || body.checks.database !== 'ok') {
      throw new Error(`Invalid body: ${JSON.stringify(body)}`);
    }
  });

  if (mode === 'square') {
    let squareSellerAgentId = '';

    await testStep('square seller agent created', async () => {
      const res = await fetch(`${BASE_URL}/v1/agents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'SelfTest Square Seller Agent',
          type: 'seller',
          ownerEmail: 'selftest-square-seller@example.com',
        }),
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      squareSellerAgentId = body.agent?.id;
      if (!squareSellerAgentId) throw new Error('Seller agent ID not returned');
    });

    await testStep('square catalog sync succeeded', async () => {
      const operatorKey = process.env.OPERATOR_API_KEY;
      if (!operatorKey) throw new Error('OPERATOR_API_KEY is not set');

      const res = await fetch(`${BASE_URL}/v1/connectors/square/sync`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-operator-key': operatorKey,
        },
        body: JSON.stringify({ sellerAgentId: squareSellerAgentId }),
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}: ${await res.text()}`);
      const body = await res.json();
      const { syncLog } = body;
      if (!syncLog) throw new Error('No syncLog returned');

      const { isPlaceholderSquareToken } = await import('@commercebackend/connector-square');
      const isLive = !isPlaceholderSquareToken(process.env.SQUARE_ACCESS_TOKEN);
      console.log(
        `  [INFO] Catalog source: ${isLive ? 'LIVE Square Sandbox API' : 'static fixture (SQUARE_ACCESS_TOKEN not configured)'}`
      );
      console.log(
        `  [INFO] Square sync: status=${syncLog.status} imported=${syncLog.itemsImported} failed=${syncLog.itemsFailed}`
      );

      if (syncLog.status === 'failed') {
        throw new Error(`Sync failed: ${JSON.stringify(syncLog.errors)}`);
      }
      if (syncLog.itemsImported === 0) {
        throw new Error('No items were imported');
      }
    });

    await testStep('imported listings persisted for the seller', async () => {
      const listings = await prisma.listing.findMany({
        where: { sellerAgentId: squareSellerAgentId, importSource: 'square' },
      });
      if (listings.length === 0)
        throw new Error('No imported Square listings found for the seller agent');
    });
  } else if (mode === 'shopify') {
    let shopifySellerAgentId = '';

    await testStep('shopify seller agent created', async () => {
      const res = await fetch(`${BASE_URL}/v1/agents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'SelfTest Shopify Seller Agent',
          type: 'seller',
          ownerEmail: 'selftest-shopify-seller@example.com',
        }),
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      shopifySellerAgentId = body.agent?.id;
      if (!shopifySellerAgentId) throw new Error('Seller agent ID not returned');
    });

    await testStep('shopify catalog sync succeeded', async () => {
      const operatorKey = process.env.OPERATOR_API_KEY;
      if (!operatorKey) throw new Error('OPERATOR_API_KEY is not set');

      const res = await fetch(`${BASE_URL}/v1/connectors/shopify/sync`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-operator-key': operatorKey,
        },
        body: JSON.stringify({ sellerAgentId: shopifySellerAgentId }),
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}: ${await res.text()}`);
      const body = await res.json();
      const { syncLog } = body;
      if (!syncLog) throw new Error('No syncLog returned');

      const { isPlaceholderShopifyToken } = await import('@commercebackend/connector-shopify');
      const isLive = !isPlaceholderShopifyToken(process.env.SHOPIFY_ACCESS_TOKEN);
      console.log(
        `  [INFO] Catalog source: ${isLive ? 'LIVE Shopify Admin API' : 'static fixture (SHOPIFY_SHOP_DOMAIN/SHOPIFY_ACCESS_TOKEN not configured)'}`
      );
      console.log(
        `  [INFO] Shopify sync: status=${syncLog.status} imported=${syncLog.itemsImported} failed=${syncLog.itemsFailed}`
      );

      if (syncLog.status === 'failed') {
        throw new Error(`Sync failed: ${JSON.stringify(syncLog.errors)}`);
      }
      if (syncLog.itemsImported === 0) {
        throw new Error('No items were imported');
      }
    });

    await testStep('imported listings persisted for the seller', async () => {
      const listings = await prisma.listing.findMany({
        where: { sellerAgentId: shopifySellerAgentId, importSource: 'shopify' },
      });
      if (listings.length === 0)
        throw new Error('No imported Shopify listings found for the seller agent');
    });
  } else if (mode === 'bigcommerce') {
    let bigcommerceSellerAgentId = '';

    await testStep('bigcommerce seller agent created', async () => {
      const res = await fetch(`${BASE_URL}/v1/agents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'SelfTest BigCommerce Seller Agent',
          type: 'seller',
          ownerEmail: 'selftest-bigcommerce-seller@example.com',
        }),
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      bigcommerceSellerAgentId = body.agent?.id;
      if (!bigcommerceSellerAgentId) throw new Error('Seller agent ID not returned');
    });

    await testStep('bigcommerce catalog sync succeeded', async () => {
      const operatorKey = process.env.OPERATOR_API_KEY;
      if (!operatorKey) throw new Error('OPERATOR_API_KEY is not set');

      const res = await fetch(`${BASE_URL}/v1/connectors/bigcommerce/sync`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-operator-key': operatorKey,
        },
        body: JSON.stringify({ sellerAgentId: bigcommerceSellerAgentId }),
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}: ${await res.text()}`);
      const body = await res.json();
      const { syncLog } = body;
      if (!syncLog) throw new Error('No syncLog returned');

      const { isPlaceholderBigCommerceToken } = await import('@commercebackend/connector-bigcommerce');
      const isLive = !isPlaceholderBigCommerceToken(process.env.BIGCOMMERCE_ACCESS_TOKEN);
      console.log(
        `  [INFO] Catalog source: ${isLive ? 'LIVE BigCommerce Catalog API' : 'static fixture (BIGCOMMERCE_STORE_HASH/BIGCOMMERCE_ACCESS_TOKEN not configured)'}`
      );
      console.log(
        `  [INFO] BigCommerce sync: status=${syncLog.status} imported=${syncLog.itemsImported} failed=${syncLog.itemsFailed}`
      );

      if (syncLog.status === 'failed') {
        throw new Error(`Sync failed: ${JSON.stringify(syncLog.errors)}`);
      }
      if (syncLog.itemsImported === 0) {
        throw new Error('No items were imported');
      }
    });

    await testStep('imported listings persisted for the seller', async () => {
      const listings = await prisma.listing.findMany({
        where: { sellerAgentId: bigcommerceSellerAgentId, importSource: 'bigcommerce' },
      });
      if (listings.length === 0)
        throw new Error('No imported BigCommerce listings found for the seller agent');
    });
  } else {
    // 3. Create seller agent
    await testStep('seller agent created', async () => {
      const res = await fetch(`${BASE_URL}/v1/agents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'SelfTest Seller Agent',
          type: 'seller',
          ownerEmail: 'selftest-seller@example.com',
        }),
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      sellerKey = body.apiKey;
      if (!sellerKey) throw new Error('API key not returned');
    });

    // 4. Create buyer agent
    await testStep('buyer agent created', async () => {
      const res = await fetch(`${BASE_URL}/v1/agents`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'SelfTest Buyer Agent',
          type: 'buyer',
          ownerEmail: 'selftest-buyer@example.com',
        }),
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      buyerKey = body.apiKey;
      if (!buyerKey) throw new Error('API key not returned');
    });

    // 5. Seller creates listing
    await testStep('listing created', async () => {
      const res = await fetch(`${BASE_URL}/v1/listings`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${sellerKey}`,
        },
        body: JSON.stringify({
          title: 'SelfTest Physical Good Item',
          description: 'Quality physical good for self-testing.',
          type: 'physical_good',
          priceAmount: 1200, // $12.00
          currency: 'USD',
          quantityAvailable: 5,
          attributes: { weight: '1.2kg' },
          fulfillmentInstructions: 'Ship via standard carrier.',
        }),
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      listingId = body.listing.id;
      if (!listingId) throw new Error('Listing ID not returned');
    });

    // 6. Buyer searches listing
    await testStep('search returned listing', async () => {
      const res = await fetch(`${BASE_URL}/v1/search`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${buyerKey}`,
        },
        body: JSON.stringify({
          query: 'SelfTest Physical',
          filters: { type: 'physical_good' },
        }),
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      if (!body.results || body.results.length === 0) throw new Error('No results returned');
      const match = body.results.some((r: any) => r.listing.id === listingId);
      if (!match) throw new Error('Listing not found in search results');
    });

    // 7. Buyer retrieves listing
    await testStep('buyer retrieves listing', async () => {
      const res = await fetch(`${BASE_URL}/v1/listings/${listingId}`, {
        headers: { authorization: `Bearer ${buyerKey}` },
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      if (body.listing.id !== listingId) throw new Error('Returned wrong listing ID');
    });

    // 7b. Give the buyer an auto-approve purchase policy. Without one, checkout
    // stops at `human_approval_required` (secure default) and no Stripe session is
    // created — so the direct happy-path below needs a policy that permits it.
    await testStep('buyer purchase policy created', async () => {
      const buyer = await prisma.agent.findFirst({
        where: { ownerEmail: 'selftest-buyer@example.com' },
      });
      if (!buyer) throw new Error('Buyer agent not found for policy setup');
      await prisma.purchasePolicy.create({
        data: {
          buyerAgentId: buyer.id,
          name: 'SelfTest Auto-Approve Policy',
          enabled: true,
          currency: 'USD',
          maxAutoApproveAmount: 1_000_000,
          requireHumanApprovalAboveAmount: 1_000_000,
        },
      });
    });

    // 8. Buyer creates checkout intent
    await testStep('checkout intent created', async () => {
      const res = await fetch(`${BASE_URL}/v1/checkout-intents`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${buyerKey}`,
        },
        body: JSON.stringify({
          listingId,
          quantity: 2,
          successUrl: 'http://localhost/success?checkoutIntentId={CHECKOUT_INTENT_ID}',
          cancelUrl: 'http://localhost/cancel?checkoutIntentId={CHECKOUT_INTENT_ID}',
        }),
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      checkoutIntentId = body.checkoutIntent.id;
      stripeSessionId = body.checkoutIntent.stripeCheckoutSessionId;
      if (!checkoutIntentId) throw new Error('CheckoutIntent ID not returned');
      if (!stripeSessionId) throw new Error('Stripe session ID not returned');
    });

    // 9. Webhook simulation (only in mock mode, or if stripe webhook can be simulated)
    await testStep('webhook processed', async () => {
      if (mode === 'stripe') {
        console.log(
          `  [INFO] Real Stripe mode: Go to Stripe Dashboard or simulate webhook for session: ${stripeSessionId}`
        );
        console.log(
          `  [INFO] Checkout URL: ${BASE_URL}/v1/checkout-intents (redirect) or directly:`
        );
        // Since we need to complete the loop, we will simulate webhook completion even in Stripe mode,
        // using the Stripe session ID created, which bypasses payment gateway human interaction.
      }

      const res = await fetch(`${BASE_URL}/v1/webhooks/stripe`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'stripe-signature': 'mock_sig_header',
        },
        body: JSON.stringify({
          id: `evt_selftest_${Math.random().toString(36).substring(2, 6)}`,
          type: 'checkout.session.completed',
          data: {
            object: {
              id: stripeSessionId,
              payment_intent: 'pi_selftest_mock_123',
              metadata: { checkoutIntentId },
            },
          },
        }),
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      if (!body.received) throw new Error(`Invalid response: ${JSON.stringify(body)}`);
    });

    // 10. Verify order created
    await testStep('order created', async () => {
      const res = await fetch(`${BASE_URL}/v1/orders?role=buyer`, {
        headers: { authorization: `Bearer ${buyerKey}` },
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      const order = body.orders.find((o: any) => o.checkoutIntentId === checkoutIntentId);
      if (!order) throw new Error('Order not found in buyer list');
      orderId = order.id;
    });

    // 11. Seller updates fulfillment
    await testStep('fulfillment updated', async () => {
      const res = await fetch(`${BASE_URL}/v1/orders/${orderId}/fulfillment`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${sellerKey}`,
        },
        body: JSON.stringify({
          fulfillmentStatus: 'fulfilled',
          fulfillmentNote: 'Shipped via carrier. Tracking: CB-TEST-12345',
        }),
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      if (body.order.fulfillmentStatus !== 'fulfilled') {
        throw new Error(
          `Fulfillment status is ${body.order.fulfillmentStatus}, expected fulfilled`
        );
      }
    });

    // 12. Buyer retrieves order and sees fulfilled
    await testStep('buyer sees fulfilled order', async () => {
      const res = await fetch(`${BASE_URL}/v1/orders/${orderId}`, {
        headers: { authorization: `Bearer ${buyerKey}` },
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      if (body.order.fulfillmentStatus !== 'fulfilled') {
        throw new Error(
          `Fulfillment status is ${body.order.fulfillmentStatus}, expected fulfilled`
        );
      }
    });
  }

  // Clean up server
  await app.close();

  // Print PASS/FAIL summary
  console.log('\nCommerceBackend self-test results:');
  let allPass = true;
  for (const r of results) {
    if (r.status === 'PASS') {
      console.log(`[PASS] ${r.name}`);
    } else {
      console.log(`[FAIL] ${r.name} - ${r.message}`);
      allPass = false;
    }
  }

  if (allPass) {
    console.log('\nResult: PASS');
    process.exit(0);
  } else {
    console.log('\nResult: FAIL');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during self-test:', err);
  process.exit(1);
});
