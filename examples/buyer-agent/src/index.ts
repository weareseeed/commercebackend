import { CommerceBackendClient } from '@commercebackend/sdk-js';

async function main() {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
  console.log(`Connecting to CommerceBackend at ${baseUrl}...`);

  const initialClient = new CommerceBackendClient({ baseUrl });

  try {
    console.log('Registering buyer agent...');
    const agentResult = await initialClient.createAgent({
      name: 'Acme Example Buyer Agent',
      type: 'buyer',
      ownerEmail: 'buyer-agent@acme.com',
    });

    console.log(`Buyer agent registered successfully! ID: ${agentResult.agent.id}`);

    const buyerClient = new CommerceBackendClient({
      baseUrl,
      apiKey: agentResult.apiKey,
    });

    const searchQuery = 'jazz tickets in Miami';
    console.log(`Searching listings for: "${searchQuery}"...`);
    const searchResult = await buyerClient.search(searchQuery, {
      type: 'event_ticket',
    });

    console.log(`Found ${searchResult.results.length} matching listing(s).`);

    if (searchResult.results.length === 0) {
      console.log('No listings found. Run the database seed script first.');
      process.exit(0);
    }

    const matchedItem = searchResult.results[0];
    const listing = matchedItem.listing;
    console.log(`Matching Listing: [${listing.title}] (ID: ${listing.id})`);
    console.log(`Match Reason: "${matchedItem.matchReason}" (Score: ${matchedItem.score})`);

    const checkoutQuantity = 2;
    console.log(`Initiating checkout intent for quantity: ${checkoutQuantity}...`);
    const checkoutResult = await buyerClient.createCheckoutIntent({
      listingId: listing.id,
      quantity: checkoutQuantity,
      successUrl: 'http://localhost:3000/success?checkout_intent_id={CHECKOUT_INTENT_ID}',
      cancelUrl: 'http://localhost:3000/cancel?checkout_intent_id={CHECKOUT_INTENT_ID}',
    });

    console.log('\n=========================================');
    console.log('BUYER CHECKOUT INTENT SUCCESSFUL');
    console.log('=========================================');
    console.log(`Buyer API Key:     ${agentResult.apiKey}`);
    console.log(`Checkout Intent ID: ${checkoutResult.checkoutIntent.id}`);
    console.log(`Listing ID:         ${checkoutResult.checkoutIntent.listingId}`);
    console.log(`Quantity:           ${checkoutResult.checkoutIntent.quantity}`);
    console.log(`Total Amount:       $${checkoutResult.checkoutIntent.amountTotal / 100}`);
    console.log(`Stripe Session ID:  ${checkoutResult.checkoutIntent.stripeCheckoutSessionId}`);
    console.log(`Stripe URL:         ${checkoutResult.checkoutIntent.checkoutUrl}`);
    console.log('=========================================\n');
  } catch (err: any) {
    console.error('Error running buyer agent example:', err.message);
    if (err.status) {
      console.error(`Error Code: ${err.code}`);
    } else {
      console.error('Make sure the CommerceBackend API server is running on http://localhost:4000');
    }
    process.exit(1);
  }
}

main();
