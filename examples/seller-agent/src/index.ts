import { CommerceBackendClient } from '@commercebackend/sdk-js';

async function main() {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:4000';
  console.log(`Connecting to CommerceBackend at ${baseUrl}...`);

  const initialClient = new CommerceBackendClient({ baseUrl });

  try {
    console.log('Registering seller agent...');
    const agentResult = await initialClient.createAgent({
      name: 'Acme Example Seller Agent',
      type: 'seller',
      ownerEmail: 'seller-agent@acme.com',
    });

    console.log(`Seller agent registered successfully! ID: ${agentResult.agent.id}`);

    const sellerClient = new CommerceBackendClient({
      baseUrl,
      apiKey: agentResult.apiKey,
    });

    console.log('Creating a fixed-price listing...');
    const listingResult = await sellerClient.createListing({
      title: 'VIP Jazz Night Ticket',
      description: 'VIP ticket for Friday jazz night in Miami.',
      type: 'event_ticket',
      priceAmount: 8500,
      currency: 'USD',
      quantityAvailable: 42,
      attributes: {
        event_date: '2026-06-12',
        start_time: '20:00',
        venue_city: 'Miami',
        age_minimum: 21,
      },
      fulfillmentInstructions: 'Email QR ticket after payment.',
    });

    console.log('\n=========================================');
    console.log('SELLER AGENT CREATION SUCCESSFUL');
    console.log('=========================================');
    console.log(`Seller API Key:   ${agentResult.apiKey}`);
    console.log(`Listing ID:       ${listingResult.listing.id}`);
    console.log(`Listing Title:    ${listingResult.listing.title}`);
    console.log(`Listing Price:    $${listingResult.listing.priceAmount / 100}`);
    console.log(`Listing Quantity: ${listingResult.listing.quantityAvailable}`);
    console.log('=========================================\n');
  } catch (err: any) {
    console.error('Error running seller agent example:', err.message);
    if (err.status) {
      console.error(`Error Code: ${err.code}`);
    } else {
      console.error('Make sure the CommerceBackend API server is running on http://localhost:4000');
    }
    process.exit(1);
  }
}

main();
