import { prisma } from './client';
import { generateApiKey } from './auth-utils';

async function main() {
  console.log('Cleaning up database...');
  await prisma.agentQueryLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.checkoutIntent.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.agent.deleteMany();

  console.log('Seeding agents...');

  const sellerKeys = generateApiKey('cb_test_seller_');
  const sellerAgent = await prisma.agent.create({
    data: {
      name: 'Acme Seller Agent',
      type: 'seller',
      ownerEmail: 'seller@acme.com',
      apiKeyHash: sellerKeys.apiKeyHash,
      status: 'active',
    },
  });

  const buyerKeys = generateApiKey('cb_test_buyer_');
  const buyerAgent = await prisma.agent.create({
    data: {
      name: 'Acme Buyer Agent',
      type: 'buyer',
      ownerEmail: 'buyer@acme.com',
      apiKeyHash: buyerKeys.apiKeyHash,
      status: 'active',
    },
  });

  console.log('Seeding listings...');

  const ticketListing = await prisma.listing.create({
    data: {
      sellerAgentId: sellerAgent.id,
      title: 'VIP Jazz Night Ticket',
      description: 'VIP ticket for Friday jazz night in Miami.',
      type: 'event_ticket',
      status: 'active',
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
    },
  });

  const digitalListing = await prisma.listing.create({
    data: {
      sellerAgentId: sellerAgent.id,
      title: 'Agentic Commerce PDF Guide',
      description: 'The complete architectural guide to building agent-first marketplaces.',
      type: 'digital_good',
      status: 'active',
      priceAmount: 1900,
      currency: 'USD',
      quantityAvailable: 100,
      attributes: {
        file_format: 'PDF',
        file_size_mb: 4.5,
        pages: 120,
      },
      fulfillmentInstructions: 'Generate one-time download link after payment.',
    },
  });

  const physicalListing = await prisma.listing.create({
    data: {
      sellerAgentId: sellerAgent.id,
      title: 'Autonomous Agent Hardware DevKit',
      description: 'Edge AI hardware kit pre-flashed with local agent runtime.',
      type: 'physical_good',
      status: 'active',
      priceAmount: 15000, // $150.00
      currency: 'USD',
      quantityAvailable: 15,
      attributes: {
        weight_oz: 12,
        dimensions: '4x4x1 inches',
        processor: 'RK3588',
      },
      fulfillmentInstructions: 'Ship via UPS Ground within 48 hours.',
    },
  });

  console.log('\n=========================================');
  console.log('SEEDING SUCCESSFUL');
  console.log('=========================================');
  console.log(`Seller Agent ID:  ${sellerAgent.id}`);
  console.log(`Seller API Key:   ${sellerKeys.apiKey}`);
  console.log('-----------------------------------------');
  console.log(`Buyer Agent ID:   ${buyerAgent.id}`);
  console.log(`Buyer API Key:    ${buyerKeys.apiKey}`);
  console.log('-----------------------------------------');
  console.log(`Listings Created:`);
  console.log(
    `  - [${ticketListing.type}] ${ticketListing.title} ($${ticketListing.priceAmount / 100}) (ID: ${ticketListing.id})`
  );
  console.log(
    `  - [${digitalListing.type}] ${digitalListing.title} ($${digitalListing.priceAmount / 100}) (ID: ${digitalListing.id})`
  );
  console.log(
    `  - [${physicalListing.type}] ${physicalListing.title} ($${physicalListing.priceAmount / 100}) (ID: ${physicalListing.id})`
  );
  console.log('=========================================\n');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
