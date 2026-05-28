import * as fs from 'fs';
import { prisma, CheckoutIntentStatus, OfferStatus, PurchasePolicyDecision } from './client';
import { generateApiKey } from './auth-utils';

const credentialsPath = '.commercebackend-seed-credentials.json';

const fixedNow = new Date('2026-05-27T12:00:00.000Z');
const tomorrow = new Date('2026-05-28T12:00:00.000Z');
const nextWeek = new Date('2026-06-03T12:00:00.000Z');
const nextMonth = new Date('2026-06-27T12:00:00.000Z');
const lastWeek = new Date('2026-05-20T12:00:00.000Z');

export const sandboxFixtureIds = {
  sellerAgentId: 'sandbox_agent_seller_primary',
  autoBuyerAgentId: 'sandbox_agent_buyer_auto',
  approvalBuyerAgentId: 'sandbox_agent_buyer_approval',
  listings: {
    vipTicket: 'sandbox_listing_vip_jazz_ticket',
    pdfGuide: 'sandbox_listing_agentic_pdf_guide',
    devkit: 'sandbox_listing_autonomous_devkit',
    negotiationWorkshop: 'sandbox_listing_custom_workshop',
    lowInventoryBundle: 'sandbox_listing_low_inventory_bundle',
  },
  purchasePolicies: {
    autoApproveLowValue: 'sandbox_policy_auto_low_value',
    approvalRequired: 'sandbox_policy_human_approval',
  },
  offers: {
    acceptedWorkshopOffer: 'sandbox_offer_accepted_workshop',
    expiredWorkshopOffer: 'sandbox_offer_expired_workshop',
  },
  checkoutIntents: {
    approvalRequiredDevkit: 'sandbox_checkout_human_approval_devkit',
  },
} as const;

type SandboxSeedResult = {
  manifest: {
    sellerAgentId: string;
    buyerAgentIds: {
      autoApproved: string;
      approvalRequired: string;
    };
    listingIds: typeof sandboxFixtureIds.listings;
    purchasePolicyIds: typeof sandboxFixtureIds.purchasePolicies;
    offerIds: typeof sandboxFixtureIds.offers;
    checkoutIntentIds: typeof sandboxFixtureIds.checkoutIntents;
  };
  credentials: {
    sellerAgentId: string;
    sellerApiKey: string;
    autoBuyerAgentId: string;
    autoBuyerApiKey: string;
    approvalBuyerAgentId: string;
    approvalBuyerApiKey: string;
  };
};

async function clearSandboxData() {
  await prisma.offerHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.checkoutIntent.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.purchasePolicy.deleteMany();
  await prisma.agentQueryLog.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.agent.deleteMany();
}

function writeCredentialsFile(result: SandboxSeedResult) {
  fs.writeFileSync(credentialsPath, JSON.stringify(result.credentials, null, 2), { mode: 0o600 });
}

export async function resetAndSeedSandbox(): Promise<SandboxSeedResult> {
  await clearSandboxData();

  const sellerKeys = generateApiKey('cb_test_seller_');
  const autoBuyerKeys = generateApiKey('cb_test_buyer_');
  const approvalBuyerKeys = generateApiKey('cb_test_buyer_');

  const sellerAgent = await prisma.agent.create({
    data: {
      id: sandboxFixtureIds.sellerAgentId,
      name: 'Sandbox Seller Agent',
      type: 'seller',
      ownerEmail: 'sandbox-seller@commercebackend.test',
      apiKeyHash: sellerKeys.apiKeyHash,
      status: 'active',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  });

  const autoBuyerAgent = await prisma.agent.create({
    data: {
      id: sandboxFixtureIds.autoBuyerAgentId,
      name: 'Sandbox Buyer Agent (Auto Approval)',
      type: 'buyer',
      ownerEmail: 'sandbox-buyer-auto@commercebackend.test',
      apiKeyHash: autoBuyerKeys.apiKeyHash,
      status: 'active',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  });

  const approvalBuyerAgent = await prisma.agent.create({
    data: {
      id: sandboxFixtureIds.approvalBuyerAgentId,
      name: 'Sandbox Buyer Agent (Approval Required)',
      type: 'buyer',
      ownerEmail: 'sandbox-buyer-approval@commercebackend.test',
      apiKeyHash: approvalBuyerKeys.apiKeyHash,
      status: 'active',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  });

  await prisma.listing.create({
    data: {
      id: sandboxFixtureIds.listings.vipTicket,
      sellerAgentId: sellerAgent.id,
      title: 'VIP Jazz Night Ticket',
      description: 'Stripe-safe sandbox ticket for a fictional Friday jazz set in Miami.',
      type: 'event_ticket',
      status: 'active',
      priceAmount: 4200,
      currency: 'USD',
      quantityAvailable: 24,
      attributes: {
        event_date: '2026-06-12',
        start_time: '20:00',
        venue_city: 'Miami',
        section: 'VIP Balcony',
      },
      fulfillmentInstructions: 'Email QR ticket after payment confirmation.',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  });

  await prisma.listing.create({
    data: {
      id: sandboxFixtureIds.listings.pdfGuide,
      sellerAgentId: sellerAgent.id,
      title: 'Agentic Commerce PDF Guide',
      description: 'Downloadable sandbox guide for agent-first marketplace builders.',
      type: 'digital_good',
      status: 'active',
      priceAmount: 1900,
      currency: 'USD',
      quantityAvailable: 500,
      attributes: {
        format: 'PDF',
        pages: 72,
        topic: 'agent-native marketplace architecture',
      },
      fulfillmentInstructions: 'Generate a one-time download link after payment.',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  });

  const devkit = await prisma.listing.create({
    data: {
      id: sandboxFixtureIds.listings.devkit,
      sellerAgentId: sellerAgent.id,
      title: 'Autonomous Agent Hardware DevKit',
      description: 'Fictional hardware bundle for testing higher-value sandbox checkout paths.',
      type: 'physical_good',
      status: 'active',
      priceAmount: 15000,
      currency: 'USD',
      quantityAvailable: 8,
      attributes: {
        processor: 'RK3588',
        memory_gb: 16,
        bundle: 'dev board + camera + PSU',
      },
      fulfillmentInstructions: 'Ship via UPS Ground within 48 hours.',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  });

  const negotiationWorkshop = await prisma.listing.create({
    data: {
      id: sandboxFixtureIds.listings.negotiationWorkshop,
      sellerAgentId: sellerAgent.id,
      title: 'Custom Commerce Workflow Workshop',
      description: 'Negotiation-friendly service listing for testing offers and accepted terms.',
      type: 'service',
      status: 'active',
      priceAmount: 25000,
      currency: 'USD',
      quantityAvailable: 6,
      attributes: {
        delivery: 'remote',
        duration_hours: 2,
        scope: 'integration discovery session',
      },
      fulfillmentInstructions: 'Coordinate scheduling after checkout.',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  });

  await prisma.listing.create({
    data: {
      id: sandboxFixtureIds.listings.lowInventoryBundle,
      sellerAgentId: sellerAgent.id,
      title: 'Low-Inventory Sensor Bundle',
      description: 'One-unit-only bundle used to verify inventory decrement behavior.',
      type: 'physical_good',
      status: 'active',
      priceAmount: 3200,
      currency: 'USD',
      quantityAvailable: 1,
      attributes: {
        sku: 'SANDBOX-SENSOR-001',
        components: ['sensor', 'cable', 'mount'],
      },
      fulfillmentInstructions: 'Reserve immediately after successful checkout.',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  });

  await prisma.purchasePolicy.create({
    data: {
      id: sandboxFixtureIds.purchasePolicies.autoApproveLowValue,
      buyerAgentId: autoBuyerAgent.id,
      name: 'Sandbox auto-approve low-value purchases',
      enabled: true,
      maxAutoApproveAmount: 5000,
      currency: 'USD',
      allowedListingTypes: ['digital_good', 'event_ticket', 'physical_good'],
      allowedSellerAgentIds: [sellerAgent.id],
      requireHumanApprovalAboveAmount: 5000,
      requireHumanApprovalForOffers: false,
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  });

  const approvalPolicy = await prisma.purchasePolicy.create({
    data: {
      id: sandboxFixtureIds.purchasePolicies.approvalRequired,
      buyerAgentId: approvalBuyerAgent.id,
      name: 'Sandbox human approval required above threshold',
      enabled: true,
      maxAutoApproveAmount: 5000,
      currency: 'USD',
      allowedListingTypes: ['physical_good', 'service'],
      allowedSellerAgentIds: [sellerAgent.id],
      requireHumanApprovalAboveAmount: 5000,
      requireHumanApprovalForOffers: true,
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  });

  const acceptedOffer = await prisma.offer.create({
    data: {
      id: sandboxFixtureIds.offers.acceptedWorkshopOffer,
      listingId: negotiationWorkshop.id,
      buyerAgentId: approvalBuyerAgent.id,
      priceAmount: 22000,
      quantity: 1,
      status: OfferStatus.accepted,
      expiresAt: nextWeek,
      acceptedPriceAmount: 23000,
      acceptedQuantity: 1,
      acceptedAt: fixedNow,
      acceptedByAgentId: sellerAgent.id,
      createdAt: lastWeek,
      updatedAt: fixedNow,
    },
  });

  await prisma.offerHistory.create({
    data: {
      offerId: acceptedOffer.id,
      fromStatus: null,
      toStatus: OfferStatus.pending,
      event: 'OFFER_CREATED',
      actorId: approvalBuyerAgent.id,
      note: 'Sandbox accepted offer fixture created.',
      metadata: { fixture: true },
      createdAt: lastWeek,
    },
  });

  await prisma.offerHistory.create({
    data: {
      offerId: acceptedOffer.id,
      fromStatus: OfferStatus.pending,
      toStatus: OfferStatus.accepted,
      event: 'OFFER_ACCEPTED',
      actorId: sellerAgent.id,
      note: 'Sandbox seller accepted the negotiated terms.',
      metadata: { acceptedPriceAmount: 23000, acceptedQuantity: 1 },
      createdAt: fixedNow,
    },
  });

  const expiredOffer = await prisma.offer.create({
    data: {
      id: sandboxFixtureIds.offers.expiredWorkshopOffer,
      listingId: negotiationWorkshop.id,
      buyerAgentId: approvalBuyerAgent.id,
      priceAmount: 18000,
      quantity: 1,
      status: OfferStatus.expired,
      expiresAt: lastWeek,
      createdAt: lastWeek,
      updatedAt: fixedNow,
    },
  });

  await prisma.offerHistory.create({
    data: {
      offerId: expiredOffer.id,
      fromStatus: null,
      toStatus: OfferStatus.pending,
      event: 'OFFER_CREATED',
      actorId: approvalBuyerAgent.id,
      note: 'Sandbox expired offer fixture created.',
      metadata: { fixture: true },
      createdAt: lastWeek,
    },
  });

  await prisma.offerHistory.create({
    data: {
      offerId: expiredOffer.id,
      fromStatus: OfferStatus.pending,
      toStatus: OfferStatus.expired,
      event: 'OFFER_EXPIRED',
      actorId: 'system',
      note: 'Sandbox expired offer fixture aged out before checkout.',
      metadata: { expiredAt: lastWeek.toISOString() },
      createdAt: fixedNow,
    },
  });

  await prisma.checkoutIntent.create({
    data: {
      id: sandboxFixtureIds.checkoutIntents.approvalRequiredDevkit,
      listingId: devkit.id,
      buyerAgentId: approvalBuyerAgent.id,
      sellerAgentId: sellerAgent.id,
      quantity: 1,
      amountSubtotal: 15000,
      amountTotal: 15000,
      currency: 'USD',
      status: CheckoutIntentStatus.human_approval_required,
      successUrl: 'https://www.commercebackend.com/docs/sandbox/?checkout=success',
      cancelUrl: 'https://www.commercebackend.com/docs/sandbox/?checkout=cancelled',
      purchasePolicyId: approvalPolicy.id,
      policyDecision: PurchasePolicyDecision.human_approval_required,
      approvalRequestedAt: tomorrow,
      createdAt: tomorrow,
      updatedAt: tomorrow,
    },
  });

  await prisma.agentQueryLog.create({
    data: {
      agentId: autoBuyerAgent.id,
      query: 'vip jazz miami',
      filters: { type: 'event_ticket', status: 'active' },
      resultCount: 1,
      createdAt: fixedNow,
    },
  });

  await prisma.agentQueryLog.create({
    data: {
      agentId: approvalBuyerAgent.id,
      query: 'workflow workshop',
      filters: { type: 'service', status: 'active' },
      resultCount: 1,
      createdAt: nextMonth,
    },
  });

  const result: SandboxSeedResult = {
    manifest: {
      sellerAgentId: sellerAgent.id,
      buyerAgentIds: {
        autoApproved: autoBuyerAgent.id,
        approvalRequired: approvalBuyerAgent.id,
      },
      listingIds: sandboxFixtureIds.listings,
      purchasePolicyIds: sandboxFixtureIds.purchasePolicies,
      offerIds: sandboxFixtureIds.offers,
      checkoutIntentIds: sandboxFixtureIds.checkoutIntents,
    },
    credentials: {
      sellerAgentId: sellerAgent.id,
      sellerApiKey: sellerKeys.apiKey,
      autoBuyerAgentId: autoBuyerAgent.id,
      autoBuyerApiKey: autoBuyerKeys.apiKey,
      approvalBuyerAgentId: approvalBuyerAgent.id,
      approvalBuyerApiKey: approvalBuyerKeys.apiKey,
    },
  };

  writeCredentialsFile(result);
  return result;
}

export function printSandboxSeedSummary(result: SandboxSeedResult) {
  console.log('\n=========================================');
  console.log('SANDBOX SEEDING SUCCESSFUL');
  console.log('=========================================');
  console.log(`Credentials file: ${credentialsPath}`);
  console.log(`Seller Agent ID:         ${result.credentials.sellerAgentId}`);
  console.log(`Auto Buyer Agent ID:     ${result.credentials.autoBuyerAgentId}`);
  console.log(`Approval Buyer Agent ID: ${result.credentials.approvalBuyerAgentId}`);
  console.log('-----------------------------------------');
  console.log('Listings Created:');
  console.log(`  - ${sandboxFixtureIds.listings.vipTicket} (VIP Jazz Night Ticket)`);
  console.log(`  - ${sandboxFixtureIds.listings.pdfGuide} (Agentic Commerce PDF Guide)`);
  console.log(`  - ${sandboxFixtureIds.listings.devkit} (Autonomous Agent Hardware DevKit)`);
  console.log(`  - ${sandboxFixtureIds.listings.negotiationWorkshop} (Custom Commerce Workflow Workshop)`);
  console.log(`  - ${sandboxFixtureIds.listings.lowInventoryBundle} (Low-Inventory Sensor Bundle)`);
  console.log('-----------------------------------------');
  console.log('Fixture IDs:');
  console.log(`  accepted offer: ${sandboxFixtureIds.offers.acceptedWorkshopOffer}`);
  console.log(`  expired offer:  ${sandboxFixtureIds.offers.expiredWorkshopOffer}`);
  console.log(`  approval intent:${sandboxFixtureIds.checkoutIntents.approvalRequiredDevkit}`);
  console.log('=========================================\n');
}

export type { SandboxSeedResult };
