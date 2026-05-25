import crypto from 'crypto';
import { prisma, generateApiKey } from '@commercebackend/db';

export function authHeader(apiKey: string) {
  return { authorization: `Bearer ${apiKey}` };
}

export async function createTestAgent(type: 'buyer' | 'seller' | 'both', overrides: any = {}) {
  const prefix = 'cb_test_';
  const { apiKey, apiKeyHash } = generateApiKey(prefix);

  const agent = await prisma.agent.create({
    data: {
      name: overrides.name || `${type.toUpperCase()} Agent ${crypto.randomBytes(3).toString('hex')}`,
      type,
      ownerEmail: overrides.ownerEmail || `agent-${crypto.randomBytes(3).toString('hex')}@test.com`,
      apiKeyHash,
      status: overrides.status || 'active',
    },
  });

  const agentWithoutHash = { ...agent };
  delete (agentWithoutHash as any).apiKeyHash;

  return {
    agent: agentWithoutHash,
    apiKey,
  };
}

export async function createSellerAgent(overrides: any = {}) {
  return createTestAgent('seller', overrides);
}

export async function createBuyerAgent(overrides: any = {}) {
  return createTestAgent('buyer', overrides);
}

export async function createListing(sellerAgentId: string, overrides: any = {}) {
  const listing = await prisma.listing.create({
    data: {
      sellerAgentId,
      title: overrides.title || 'VIP Ticket',
      description: overrides.description || 'Concert front row ticket',
      type: overrides.type || 'event_ticket',
      status: overrides.status || 'active',
      priceAmount: overrides.priceAmount !== undefined ? overrides.priceAmount : 1000,
      currency: overrides.currency || 'USD',
      quantityAvailable: overrides.quantityAvailable !== undefined ? overrides.quantityAvailable : 5,
      attributes: overrides.attributes || {},
      fulfillmentInstructions: overrides.fulfillmentInstructions || 'Download link will be provided',
    },
  });
  return listing;
}

export async function createCheckoutIntent(buyerAgentId: string, sellerAgentId: string, listingId: string, overrides: any = {}) {
  const intent = await prisma.checkoutIntent.create({
    data: {
      listingId,
      buyerAgentId,
      sellerAgentId,
      quantity: overrides.quantity || 1,
      amountSubtotal: overrides.amountTotal || 1000,
      amountTotal: overrides.amountTotal || 1000,
      currency: overrides.currency || 'USD',
      status: overrides.status || 'open',
      stripeCheckoutSessionId: overrides.stripeCheckoutSessionId || `cs_${crypto.randomBytes(5).toString('hex')}`,
      checkoutUrl: overrides.checkoutUrl || `https://checkout.stripe.com/pay/${crypto.randomBytes(5).toString('hex')}`,
    },
  });
  return intent;
}

export async function createPaidOrder(buyerAgentId: string, sellerAgentId: string, listingId: string, checkoutIntentId: string, overrides: any = {}) {
  const order = await prisma.order.create({
    data: {
      checkoutIntentId,
      listingId,
      buyerAgentId,
      sellerAgentId,
      quantity: overrides.quantity || 1,
      amountTotal: overrides.amountTotal || 1000,
      currency: overrides.currency || 'USD',
      paymentStatus: overrides.paymentStatus || 'paid',
      fulfillmentStatus: overrides.fulfillmentStatus || 'pending',
      fulfillmentNote: overrides.fulfillmentNote || null,
    },
  });
  return order;
}
