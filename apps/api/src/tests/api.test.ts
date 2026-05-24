import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- IN-MEMORY DB STORE ---
const mockDb = {
  agents: [] as any[],
  listings: [] as any[],
  checkoutIntents: [] as any[],
  orders: [] as any[],
  queryLogs: [] as any[],
  reset() {
    this.agents = [];
    this.listings = [];
    this.checkoutIntents = [];
    this.orders = [];
    this.queryLogs = [];
  },
};

// --- MOCK DATABASE WORKSPACE PACKAGE ---
vi.mock('@commercebackend/db', () => {
  const hashKey = (key: string) => `hash_${key}`;

  const prismaMock: any = {
    agent: {
      create: vi.fn(async ({ data }) => {
        const newAgent = {
          id: `agent_${Math.random().toString(36).substring(2, 11)}`,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        mockDb.agents.push(newAgent);
        return newAgent;
      }),
      findFirst: vi.fn(async ({ where }) => {
        return (
          mockDb.agents.find((a) => {
            if (where.apiKeyHash && a.apiKeyHash !== where.apiKeyHash) return false;
            return true;
          }) || null
        );
      }),
      findUnique: vi.fn(async ({ where }) => {
        return mockDb.agents.find((a) => a.id === where.id) || null;
      }),
      deleteMany: vi.fn(),
    },
    listing: {
      create: vi.fn(async ({ data }) => {
        const newListing = {
          id: `lst_${Math.random().toString(36).substring(2, 11)}`,
          status: data.quantityAvailable > 0 ? 'active' : 'sold_out',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        mockDb.listings.push(newListing);
        return newListing;
      }),
      findUnique: vi.fn(async ({ where }) => {
        const listing = mockDb.listings.find((l) => l.id === where.id);
        return listing || null;
      }),
      findMany: vi.fn(async ({ where }) => {
        return mockDb.listings.filter((l) => {
          if (where?.status && l.status !== where.status) return false;
          if (where?.type && l.type !== where.type) return false;
          if (where?.currency && l.currency !== where.currency) return false;
          if (where?.priceAmount?.lte && l.priceAmount > where.priceAmount.lte) return false;
          return true;
        });
      }),
      update: vi.fn(async ({ where, data }) => {
        const listing = mockDb.listings.find((l) => l.id === where.id);
        if (!listing) throw new Error('Listing not found');
        Object.assign(listing, data);
        return listing;
      }),
      deleteMany: vi.fn(),
    },
    checkoutIntent: {
      create: vi.fn(async ({ data }) => {
        const newIntent = {
          id: `chk_${Math.random().toString(36).substring(2, 11)}`,
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        mockDb.checkoutIntents.push(newIntent);
        return newIntent;
      }),
      findUnique: vi.fn(async ({ where }) => {
        return mockDb.checkoutIntents.find((c) => c.id === where.id) || null;
      }),
      update: vi.fn(async ({ where, data }) => {
        const intent = mockDb.checkoutIntents.find((c) => c.id === where.id);
        if (!intent) throw new Error('CheckoutIntent not found');
        Object.assign(intent, data);
        return intent;
      }),
      deleteMany: vi.fn(),
    },
    order: {
      create: vi.fn(async ({ data }) => {
        const newOrder = {
          id: `ord_${Math.random().toString(36).substring(2, 11)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        mockDb.orders.push(newOrder);
        return newOrder;
      }),
      findUnique: vi.fn(async ({ where }) => {
        return (
          mockDb.orders.find(
            (o) => o.id === where.id || o.checkoutIntentId === where.checkoutIntentId
          ) || null
        );
      }),
      findMany: vi.fn(async ({ where }) => {
        return mockDb.orders.filter((o) => {
          if (where?.buyerAgentId && o.buyerAgentId !== where.buyerAgentId) return false;
          if (where?.sellerAgentId && o.sellerAgentId !== where.sellerAgentId) return false;
          if (where?.OR) {
            const matched = where.OR.some((cond: any) => {
              if (cond.buyerAgentId && o.buyerAgentId === cond.buyerAgentId) return true;
              if (cond.sellerAgentId && o.sellerAgentId === cond.sellerAgentId) return true;
              return false;
            });
            if (!matched) return false;
          }
          return true;
        });
      }),
      update: vi.fn(async ({ where, data }) => {
        const order = mockDb.orders.find((o) => o.id === where.id);
        if (!order) throw new Error('Order not found');
        Object.assign(order, data);
        return order;
      }),
      deleteMany: vi.fn(),
    },
    agentQueryLog: {
      create: vi.fn(async ({ data }) => {
        const log = {
          id: `log_${Math.random().toString(36).substring(2, 11)}`,
          createdAt: new Date(),
          ...data,
        };
        mockDb.queryLogs.push(log);
        return log;
      }),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(prismaMock)),
  };

  return {
    prisma: prismaMock,
    hashApiKey: hashKey,
    generateApiKey: (prefix: string) => {
      const apiKey = `${prefix}mock_key_${Math.random().toString(36).substring(2, 9)}`;
      return { apiKey, apiKeyHash: hashKey(apiKey) };
    },
  };
});

// --- MOCK STRIPE PAYMENTS WORKSPACE PACKAGE ---
vi.mock('@commercebackend/payments-stripe', () => {
  return {
    createStripeCheckoutSession: vi.fn(async (input) => {
      return {
        id: `cs_${Math.random().toString(36).substring(2, 11)}`,
        url: `https://checkout.stripe.com/pay/${Math.random().toString(36).substring(2, 11)}`,
      };
    }),
    constructStripeEvent: vi.fn((rawBody, sig) => {
      return JSON.parse(rawBody.toString());
    }),
  };
});

// Import built app for injection tests
import { buildApp } from '../app';

const app = buildApp();

describe('CommerceBackend v0.1 API Integration Tests', () => {
  let buyerKey: string;
  let buyerId: string;
  let sellerKey: string;
  let sellerId: string;
  let testListingId: string;

  beforeEach(() => {
    mockDb.reset();
  });

  describe('Agent API Endpoints', () => {
    it('should create a buyer agent and return api key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: {
          name: 'Acme Buyer Agent',
          type: 'buyer',
          ownerEmail: 'ops-buyer@acme.com',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.agent.name).toBe('Acme Buyer Agent');
      expect(data.agent.type).toBe('buyer');
      expect(data.agent.status).toBe('active');
      expect(data.apiKey).toBeDefined();
      expect(data.apiKey).toContain('cb_test_');

      buyerKey = data.apiKey;
      buyerId = data.agent.id;
    });

    it('should create a seller agent and return api key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: {
          name: 'Acme Seller Agent',
          type: 'seller',
          ownerEmail: 'ops-seller@acme.com',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.agent.type).toBe('seller');
      expect(data.apiKey).toBeDefined();

      sellerKey = data.apiKey;
      sellerId = data.agent.id;
    });

    it('should reject agent creation with invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: {
          name: 'Acme Bad Agent',
          type: 'buyer',
          ownerEmail: 'invalid-email-address',
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should authenticate requests using API key header', async () => {
      // Pre-seed an agent in memory
      const responseSeed = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: {
          name: 'Test Auth Agent',
          type: 'buyer',
          ownerEmail: 'auth@test.com',
        },
      });
      const { apiKey } = JSON.parse(responseSeed.body);

      const responseAuth = await app.inject({
        method: 'GET',
        url: '/v1/agents/me',
        headers: {
          authorization: `Bearer ${apiKey}`,
        },
      });

      expect(responseAuth.statusCode).toBe(200);
      const authData = JSON.parse(responseAuth.body);
      expect(authData.agent.name).toBe('Test Auth Agent');
    });

    it('should reject requests with invalid API key header', async () => {
      const responseAuth = await app.inject({
        method: 'GET',
        url: '/v1/agents/me',
        headers: {
          authorization: `Bearer cb_test_invalidkey123`,
        },
      });

      expect(responseAuth.statusCode).toBe(401);
      const authData = JSON.parse(responseAuth.body);
      expect(authData.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Listings API Endpoints', () => {
    beforeEach(async () => {
      // Seed buyer & seller agents for listing tests
      const resSeller = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'S1', type: 'seller', ownerEmail: 's1@acme.com' },
      });
      sellerKey = JSON.parse(resSeller.body).apiKey;
      sellerId = JSON.parse(resSeller.body).agent.id;

      const resBuyer = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'B1', type: 'buyer', ownerEmail: 'b1@acme.com' },
      });
      buyerKey = JSON.parse(resBuyer.body).apiKey;
      buyerId = JSON.parse(resBuyer.body).agent.id;
    });

    it('should allow seller agents to create fixed price listings', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          title: 'VIP Concert Ticket',
          description: 'Premium row seating.',
          type: 'event_ticket',
          priceAmount: 10000,
          currency: 'USD',
          quantityAvailable: 10,
          attributes: { date: '2026-10-10' },
          fulfillmentInstructions: 'Email PDF',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.listing.title).toBe('VIP Concert Ticket');
      expect(data.listing.sellerAgentId).toBe(sellerId);
      expect(data.listing.status).toBe('active');

      testListingId = data.listing.id;
    });

    it('should reject listing creation from buyer agents', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          title: 'Illegal Buyer Listing',
          type: 'physical_good',
          priceAmount: 500,
          quantityAvailable: 2,
        },
      });

      expect(response.statusCode).toBe(403);
      const data = JSON.parse(response.body);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should reject listing creation with negative price amount', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          title: 'Bad Price Listing',
          type: 'digital_good',
          priceAmount: -100,
          quantityAvailable: 5,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject listing creation with negative quantity', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          title: 'Bad Quantity Listing',
          type: 'digital_good',
          priceAmount: 100,
          quantityAvailable: -5,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should allow listing owner to update details', async () => {
      const setupRes = await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          title: 'Updatable Listing',
          type: 'digital_good',
          priceAmount: 2000,
          quantityAvailable: 5,
        },
      });
      const listingId = JSON.parse(setupRes.body).listing.id;

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/listings/${listingId}`,
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          title: 'Updated Title',
          priceAmount: 2500,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.listing.title).toBe('Updated Title');
      expect(data.listing.priceAmount).toBe(2500);
    });

    it('should forbid non-owner seller agents from updating details', async () => {
      const setupRes = await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          title: 'Secure Listing',
          type: 'digital_good',
          priceAmount: 2000,
          quantityAvailable: 5,
        },
      });
      const listingId = JSON.parse(setupRes.body).listing.id;

      // Register another seller agent
      const otherSellerRes = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'S2', type: 'seller', ownerEmail: 's2@acme.com' },
      });
      const otherSellerKey = JSON.parse(otherSellerRes.body).apiKey;

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/listings/${listingId}`,
        headers: { authorization: `Bearer ${otherSellerKey}` },
        payload: {
          title: 'Hacked Title',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Search API Endpoints', () => {
    beforeEach(async () => {
      // Seed seller
      const resSeller = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'Seller', type: 'seller', ownerEmail: 's@search.com' },
      });
      sellerKey = JSON.parse(resSeller.body).apiKey;

      // Create list of listings
      await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          title: 'Miami Jazz VIP Concert',
          description: 'Fun concert',
          type: 'event_ticket',
          priceAmount: 8500,
          quantityAvailable: 5,
          attributes: { venue: 'Miami Central Park' },
        },
      });

      await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          title: 'Miami Rock Festival',
          description: 'Rock out',
          type: 'event_ticket',
          priceAmount: 9500,
          quantityAvailable: 10,
          attributes: { venue: 'Miami Beach' },
        },
      });

      // Seeding a paused listing
      const resPaused = await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          title: 'Miami Electro Night (Paused)',
          description: 'Late night show',
          type: 'event_ticket',
          priceAmount: 5000,
          quantityAvailable: 5,
        },
      });
      const pausedId = JSON.parse(resPaused.body).listing.id;
      await app.inject({
        method: 'POST',
        url: `/v1/listings/${pausedId}/pause`,
        headers: { authorization: `Bearer ${sellerKey}` },
      });
    });

    it('should search active listings and return correct matching score and reason', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/search',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          query: 'Miami Concert VIP',
          filters: {
            type: 'event_ticket',
            status: 'active',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.results[0].listing.title).toBe('Miami Jazz VIP Concert');
      expect(data.results[0].score).toBeDefined();
      expect(data.results[0].matchReason).toContain('title');

      // Verify the query was logged
      expect(mockDb.queryLogs.length).toBe(1);
      expect(mockDb.queryLogs[0].query).toBe('Miami Concert VIP');
    });

    it('should exclude paused listings from search results by default', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/search',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          query: 'Electro',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      // Electro listing was paused, so it shouldn't show up in default (active) search
      expect(data.results.length).toBe(0);
    });
  });

  describe('Checkout Intents API', () => {
    beforeEach(async () => {
      // Seed buyer & seller
      const resSeller = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'Seller', type: 'seller', ownerEmail: 's@checkout.com' },
      });
      sellerKey = JSON.parse(resSeller.body).apiKey;
      sellerId = JSON.parse(resSeller.body).agent.id;

      const resBuyer = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'Buyer', type: 'buyer', ownerEmail: 'b@checkout.com' },
      });
      buyerKey = JSON.parse(resBuyer.body).apiKey;
      buyerId = JSON.parse(resBuyer.body).agent.id;

      // Add listing
      const resListing = await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          title: 'Checkout Ticket',
          type: 'event_ticket',
          priceAmount: 5000,
          quantityAvailable: 3,
        },
      });
      testListingId = JSON.parse(resListing.body).listing.id;
    });

    it('should allow buyer agents to initiate a checkout intent with Stripe redirect', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          listingId: testListingId,
          quantity: 2,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.checkoutIntent.status).toBe('open');
      expect(data.checkoutIntent.amountTotal).toBe(10000);
      expect(data.checkoutIntent.buyerAgentId).toBe(buyerId);
      expect(data.checkoutIntent.stripeCheckoutSessionId).toContain('cs_');
      expect(data.checkoutIntent.checkoutUrl).toContain('https://checkout.stripe.com/');
    });

    it('should forbid seller agents from purchasing their own listings', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          listingId: testListingId,
          quantity: 1,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });

      expect(response.statusCode).toBe(403);
      const data = JSON.parse(response.body);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should reject checkout intents for quantities exceeding stock', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          listingId: testListingId,
          quantity: 5, // Only 3 are available
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.error.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('Stripe Webhook Processing & Orders', () => {
    let checkoutIntentId: string;
    let stripeSessionId: string;

    beforeEach(async () => {
      // Seed buyer & seller
      const resSeller = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'S3', type: 'seller', ownerEmail: 's3@webhook.com' },
      });
      sellerKey = JSON.parse(resSeller.body).apiKey;
      sellerId = JSON.parse(resSeller.body).agent.id;

      const resBuyer = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'B3', type: 'buyer', ownerEmail: 'b3@webhook.com' },
      });
      buyerKey = JSON.parse(resBuyer.body).apiKey;
      buyerId = JSON.parse(resBuyer.body).agent.id;

      // Listing with exactly 2 items
      const resListing = await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          title: 'Stock Limited Item',
          type: 'physical_good',
          priceAmount: 3000,
          quantityAvailable: 2,
        },
      });
      testListingId = JSON.parse(resListing.body).listing.id;

      // Create checkout intent for 2 items (empties the stock on payment)
      const resIntent = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          listingId: testListingId,
          quantity: 2,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });
      const intentData = JSON.parse(resIntent.body).checkoutIntent;
      checkoutIntentId = intentData.id;
      stripeSessionId = intentData.stripeCheckoutSessionId;
    });

    it('should handle Stripe checkout.session.completed webhook, mark paid, create order, and decrement stock', async () => {
      // Call stripe webhook endpoint with mock event raw data
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: stripeSessionId,
            payment_intent: 'pi_mock_12345',
            metadata: {
              checkoutIntentId: checkoutIntentId,
            },
          },
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': 'mock_signature',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(mockEvent),
      });

      expect(response.statusCode).toBe(200);

      // Verify checkout intent is updated to paid
      const intent = mockDb.checkoutIntents.find((i) => i.id === checkoutIntentId);
      expect(intent.status).toBe('paid');
      expect(intent.stripePaymentIntentId).toBe('pi_mock_12345');

      // Verify order is created
      expect(mockDb.orders.length).toBe(1);
      expect(mockDb.orders[0].checkoutIntentId).toBe(checkoutIntentId);
      expect(mockDb.orders[0].paymentStatus).toBe('paid');
      expect(mockDb.orders[0].fulfillmentStatus).toBe('pending');

      // Verify listing inventory is decremented to 0 and becomes sold_out
      const listing = mockDb.listings.find((l) => l.id === testListingId);
      expect(listing.quantityAvailable).toBe(0);
      expect(listing.status).toBe('sold_out');
    });

    it('should process webhook idempotently and not create duplicate orders', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: stripeSessionId,
            payment_intent: 'pi_mock_12345',
            metadata: {
              checkoutIntentId: checkoutIntentId,
            },
          },
        },
      };

      // Webhook call 1
      await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': 'sig1',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(mockEvent),
      });
      expect(mockDb.orders.length).toBe(1);

      // Webhook call 2 (retry)
      const responseRetry = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': 'sig2',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(mockEvent),
      });
      expect(responseRetry.statusCode).toBe(200);

      // Verify order count is still exactly 1
      expect(mockDb.orders.length).toBe(1);
    });

    it('should allow buyer to see own order and forbid unrelated agents', async () => {
      // 1. Process webhook to create the order
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: stripeSessionId,
            payment_intent: 'pi_mock_12345',
            metadata: {
              checkoutIntentId: checkoutIntentId,
            },
          },
        },
      };
      await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': 'sig',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(mockEvent),
      });
      const orderId = mockDb.orders[0].id;

      // 2. Buyer gets order list
      const resBuyerOrders = await app.inject({
        method: 'GET',
        url: '/v1/orders',
        headers: { authorization: `Bearer ${buyerKey}` },
      });
      expect(JSON.parse(resBuyerOrders.body).orders.length).toBe(1);

      // 3. Buyer gets specific order details
      const resBuyerDetails = await app.inject({
        method: 'GET',
        url: `/v1/orders/${orderId}`,
        headers: { authorization: `Bearer ${buyerKey}` },
      });
      expect(resBuyerDetails.statusCode).toBe(200);

      // 4. Seller gets specific order details
      const resSellerDetails = await app.inject({
        method: 'GET',
        url: `/v1/orders/${orderId}`,
        headers: { authorization: `Bearer ${sellerKey}` },
      });
      expect(resSellerDetails.statusCode).toBe(200);

      // 5. Unrelated agent gets specific order details
      const resUnrelated = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'U1', type: 'buyer', ownerEmail: 'u1@web.com' },
      });
      const unrelatedKey = JSON.parse(resUnrelated.body).apiKey;

      const resUnrelatedDetails = await app.inject({
        method: 'GET',
        url: `/v1/orders/${orderId}`,
        headers: { authorization: `Bearer ${unrelatedKey}` },
      });
      expect(resUnrelatedDetails.statusCode).toBe(403);
    });

    it('should allow seller to update fulfillment status and forbid buyer', async () => {
      // 1. Process webhook to create the order
      const mockEvent = {
        id: 'evt_test_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: stripeSessionId,
            payment_intent: 'pi_mock_12345',
            metadata: {
              checkoutIntentId: checkoutIntentId,
            },
          },
        },
      };
      await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': 'sig',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(mockEvent),
      });
      const orderId = mockDb.orders[0].id;

      // 2. Buyer attempts to update fulfillment
      const resBuyerFulfill = await app.inject({
        method: 'POST',
        url: `/v1/orders/${orderId}/fulfillment`,
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          fulfillmentStatus: 'fulfilled',
          fulfillmentNote: 'I want this now!',
        },
      });
      expect(resBuyerFulfill.statusCode).toBe(403);

      // 3. Seller updates fulfillment
      const resSellerFulfill = await app.inject({
        method: 'POST',
        url: `/v1/orders/${orderId}/fulfillment`,
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          fulfillmentStatus: 'fulfilled',
          fulfillmentNote: 'QR tickets emailed to buyer.',
        },
      });
      expect(resSellerFulfill.statusCode).toBe(200);

      // Verify DB update
      const order = mockDb.orders.find((o) => o.id === orderId);
      expect(order.fulfillmentStatus).toBe('fulfilled');
      expect(order.fulfillmentNote).toBe('QR tickets emailed to buyer.');
    });
  });
});
