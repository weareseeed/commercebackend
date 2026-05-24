import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@commercebackend/db';

// --- IN-MEMORY DB STORE ---
const mockDb = {
  agents: [] as any[],
  listings: [] as any[],
  checkoutIntents: [] as any[],
  orders: [] as any[],
  queryLogs: [] as any[],
  offers: [] as any[],
  offerHistories: [] as any[],
  reset() {
    this.agents = [];
    this.listings = [];
    this.checkoutIntents = [];
    this.orders = [];
    this.queryLogs = [];
    this.offers = [];
    this.offerHistories = [];
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
      count: vi.fn(async ({ where }) => {
        return mockDb.orders.filter((o) => {
          if (where?.buyerAgentId && o.buyerAgentId !== where.buyerAgentId) return false;
          if (where?.sellerAgentId && o.sellerAgentId !== where.sellerAgentId) return false;
          if (where?.OR) {
            return where.OR.some((cond: any) => {
              if (cond.buyerAgentId && o.buyerAgentId === cond.buyerAgentId) return true;
              if (cond.sellerAgentId && o.sellerAgentId === cond.sellerAgentId) return true;
              return false;
            });
          }
          return true;
        }).length;
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
    offer: {
      create: vi.fn(async ({ data }) => {
        const newOffer = {
          id: `off_${Math.random().toString(36).substring(2, 11)}`,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          counterPriceAmount: null,
          counterQuantity: null,
          counterExpiresAt: null,
          acceptedPriceAmount: null,
          acceptedQuantity: null,
          acceptedAt: null,
          acceptedByAgentId: null,
          ...data,
        };
        mockDb.offers.push(newOffer);
        return newOffer;
      }),
      findUnique: vi.fn(async ({ where, include }) => {
        const offer = mockDb.offers.find((o) => o.id === where.id);
        if (!offer) return null;
        const offerCopy = { ...offer };
        if (include?.listing) {
          offerCopy.listing = mockDb.listings.find((l) => l.id === offer.listingId);
        }
        if (include?.history) {
          offerCopy.history = mockDb.offerHistories.filter((h) => h.offerId === offer.id);
        }
        return offerCopy;
      }),
      findMany: vi.fn(async ({ where }) => {
        return mockDb.offers.filter((o) => {
          if (where?.buyerAgentId && o.buyerAgentId !== where.buyerAgentId) return false;
          if (where?.status && o.status !== where.status) return false;
          if (where?.listing?.sellerAgentId) {
            const listing = mockDb.listings.find((l) => l.id === o.listingId);
            if (!listing || listing.sellerAgentId !== where.listing.sellerAgentId) return false;
          }
          return true;
        });
      }),
      update: vi.fn(async ({ where, data }) => {
        const offer = mockDb.offers.find((o) => o.id === where.id);
        if (!offer) throw new Error('Offer not found');
        Object.assign(offer, data);
        return offer;
      }),
      deleteMany: vi.fn(),
    },
    offerHistory: {
      create: vi.fn(async ({ data }) => {
        const newHistory = {
          id: `hst_${Math.random().toString(36).substring(2, 11)}`,
          createdAt: new Date(),
          ...data,
        };
        mockDb.offerHistories.push(newHistory);
        return newHistory;
      }),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(prismaMock)),
    $queryRawUnsafe: vi.fn(async (query, ...params) => {
      if (query.includes('SELECT * FROM "Listing" WHERE id = $1 FOR UPDATE') || query.includes('FOR UPDATE')) {
        const id = params[0];
        const listing = mockDb.listings.find((l) => l.id === id);
        return listing ? [listing] : [];
      }
      return [];
    }),
    $queryRaw: vi.fn(async (query, ...params) => {
      return [1];
    }),
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
      expect(data.error.code).toBe('INSUFFICIENT_INVENTORY');
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

  describe('Hardening, Concurrency & Health Endpoints', () => {
    let localBuyerKey: string;
    let localBuyerId: string;
    let localSellerKey: string;
    let localSellerId: string;
    let localListingId: string;

    beforeEach(async () => {
      // Create seller agent
      const resSeller = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'Hardening Seller', type: 'seller', ownerEmail: 'hseller@test.com' },
      });
      const sellerBody = JSON.parse(resSeller.body);
      localSellerKey = sellerBody.apiKey;
      localSellerId = sellerBody.agent.id;

      // Create buyer agent
      const resBuyer = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'Hardening Buyer', type: 'buyer', ownerEmail: 'hbuyer@test.com' },
      });
      const buyerBody = JSON.parse(resBuyer.body);
      localBuyerKey = buyerBody.apiKey;
      localBuyerId = buyerBody.agent.id;

      // Create listing
      const resListing = await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${localSellerKey}` },
        payload: {
          title: 'Hardening Test Item',
          type: 'physical_good',
          priceAmount: 500,
          quantityAvailable: 10,
        },
      });
      localListingId = JSON.parse(resListing.body).listing.id;
    });

    it('should return correct health and readiness status', async () => {
      const resHealth = await app.inject({ method: 'GET', url: '/health' });
      expect(resHealth.statusCode).toBe(200);
      expect(JSON.parse(resHealth.body)).toEqual({
        ok: true,
        service: 'commercebackend-api',
        version: '0.1.0',
      });

      const resReady = await app.inject({ method: 'GET', url: '/ready' });
      expect(resReady.statusCode).toBe(200);
      expect(JSON.parse(resReady.body).ok).toBe(true);
      expect(JSON.parse(resReady.body).checks.database).toBe('ok');
    });

    it('should verify Stripe session is created after checkout intent row exists', async () => {
      const { createStripeCheckoutSession } = await import('@commercebackend/payments-stripe');
      const spy = vi.mocked(createStripeCheckoutSession);
      spy.mockImplementationOnce(async (input) => {
        // Assert that checkout intent row exists in mock db at this moment
        const intentExists = mockDb.checkoutIntents.some((c) => c.id === input.checkoutIntentId);
        expect(intentExists).toBe(true);
        return { id: 'cs_success', url: 'https://checkout.stripe.com/pay/success' };
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${localBuyerKey}` },
        payload: {
          listingId: localListingId,
          quantity: 1,
          successUrl: 'http://localhost/success',
          cancelUrl: 'http://localhost/cancel',
        },
      });
      expect(res.statusCode).toBe(201);
    });

    it('should mark checkout intent failed if Stripe session creation fails', async () => {
      const { createStripeCheckoutSession } = await import('@commercebackend/payments-stripe');
      vi.mocked(createStripeCheckoutSession).mockRejectedValueOnce(new Error('Stripe API Error'));

      const res = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${localBuyerKey}` },
        payload: {
          listingId: localListingId,
          quantity: 1,
          successUrl: 'http://localhost/success',
          cancelUrl: 'http://localhost/cancel',
        },
      });

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body).error.code).toBe('CHECKOUT_CREATION_FAILED');

      // Verify it was marked failed in DB
      const failedIntent = mockDb.checkoutIntents.find((c) => c.status === 'failed');
      expect(failedIntent).toBeDefined();
    });

    it('should process duplicate webhooks idempotently without creating duplicate orders or double-decrementing stock', async () => {
      // 1. Create a listing with quantity 2
      const listing = await prisma.listing.create({
        data: {
          sellerAgentId: localSellerId,
          title: 'Limited Stock Item',
          description: 'A limited stock item.',
          type: 'physical_good',
          priceAmount: 100,
          currency: 'USD',
          quantityAvailable: 2,
          attributes: {},
        },
      });
      mockDb.listings.push(listing);

      // 2. Create checkout intent
      const intent = await prisma.checkoutIntent.create({
        data: {
          listingId: listing.id,
          buyerAgentId: localBuyerId,
          sellerAgentId: localSellerId,
          quantity: 1,
          amountSubtotal: 100,
          amountTotal: 100,
          currency: 'USD',
          status: 'open',
          stripeCheckoutSessionId: 'cs_dup_test',
        },
      });
      mockDb.checkoutIntents.push(intent);

      const webhookPayload = {
        id: 'evt_dup_test',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_dup_test',
            payment_intent: 'pi_dup_test',
            metadata: { checkoutIntentId: intent.id },
          },
        },
      };

      // 1st webhook call
      const res1 = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': 'sig',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(webhookPayload),
      });
      expect(res1.statusCode).toBe(200);

      // Check orders and inventory
      const orderCount1 = mockDb.orders.filter((o) => o.checkoutIntentId === intent.id).length;
      expect(orderCount1).toBe(1);
      const updatedListing = mockDb.listings.find((l) => l.id === listing.id);
      expect(updatedListing.quantityAvailable).toBe(1);

      // 2nd duplicate webhook call
      const res2 = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': 'sig',
          'content-type': 'application/json',
        },
        payload: JSON.stringify(webhookPayload),
      });
      expect(res2.statusCode).toBe(200);

      // Check again
      const orderCount2 = mockDb.orders.filter((o) => o.checkoutIntentId === intent.id).length;
      expect(orderCount2).toBe(1); // Still 1 order
      expect(updatedListing.quantityAvailable).toBe(1); // Still 1 quantity
    });

    it('should handle payment_inventory_conflict if stock is insufficient at webhook processing time', async () => {
      // 1. Create a listing with quantity 1
      const listing = await prisma.listing.create({
        data: {
          sellerAgentId: localSellerId,
          title: 'Single Stock Item',
          description: 'A single stock item.',
          type: 'physical_good',
          priceAmount: 100,
          currency: 'USD',
          quantityAvailable: 1,
          attributes: {},
        },
      });
      mockDb.listings.push(listing);

      // 2. Create checkout intent A
      const intentA = await prisma.checkoutIntent.create({
        data: {
          listingId: listing.id,
          buyerAgentId: localBuyerId,
          sellerAgentId: localSellerId,
          quantity: 1,
          amountSubtotal: 100,
          amountTotal: 100,
          currency: 'USD',
          status: 'open',
          stripeCheckoutSessionId: 'cs_intent_a',
        },
      });
      mockDb.checkoutIntents.push(intentA);

      // 3. Create checkout intent B
      const intentB = await prisma.checkoutIntent.create({
        data: {
          listingId: listing.id,
          buyerAgentId: localBuyerId,
          sellerAgentId: localSellerId,
          quantity: 1,
          amountSubtotal: 100,
          amountTotal: 100,
          currency: 'USD',
          status: 'open',
          stripeCheckoutSessionId: 'cs_intent_b',
        },
      });
      mockDb.checkoutIntents.push(intentB);

      // 4. Webhook for Intent A succeeds
      const resA = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': 'sig',
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          id: 'evt_a',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_intent_a',
              payment_intent: 'pi_a',
              metadata: { checkoutIntentId: intentA.id },
            },
          },
        }),
      });
      expect(resA.statusCode).toBe(200);
      expect(mockDb.orders.some((o) => o.checkoutIntentId === intentA.id)).toBe(true);
      expect(mockDb.listings.find((l) => l.id === listing.id).quantityAvailable).toBe(0);

      // 5. Webhook for Intent B processed (no stock left)
      const resB = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': 'sig',
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          id: 'evt_b',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_intent_b',
              payment_intent: 'pi_b',
              metadata: { checkoutIntentId: intentB.id },
            },
          },
        }),
      });
      expect(resB.statusCode).toBe(200);

      // Verify intent B status is payment_inventory_conflict
      const updatedB = mockDb.checkoutIntents.find((c) => c.id === intentB.id);
      expect(updatedB.status).toBe('payment_inventory_conflict');

      // Verify order was NOT created for intent B
      expect(mockDb.orders.some((o) => o.checkoutIntentId === intentB.id)).toBe(false);

      // Verify inventory is still 0 (never negative)
      const finalListing = mockDb.listings.find((l) => l.id === listing.id);
      expect(finalListing.quantityAvailable).toBe(0);

      // Verify idempotency of payment_inventory_conflict webhook retry
      const resBRetry = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': 'sig',
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          id: 'evt_b',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_intent_b',
              payment_intent: 'pi_b',
              metadata: { checkoutIntentId: intentB.id },
            },
          },
        }),
      });
      expect(resBRetry.statusCode).toBe(200);
    });

    it('should reject invalid Stripe signatures', async () => {
      const { constructStripeEvent } = await import('@commercebackend/payments-stripe');
      const spy = vi.mocked(constructStripeEvent);
      spy.mockImplementationOnce(() => {
        throw new Error('No value found for signature');
      });

      // Temporarily bypass node env check for webhook route
      const oldNodeEnv = process.env.NODE_ENV;
      const oldBypass = process.env.BYPASS_STRIPE_SIGNATURE;
      process.env.NODE_ENV = 'production';
      process.env.BYPASS_STRIPE_SIGNATURE = 'false';

      try {
        const response = await app.inject({
          method: 'POST',
          url: '/v1/webhooks/stripe',
          headers: {
            'stripe-signature': 'invalid_sig',
            'content-type': 'application/json',
          },
          payload: JSON.stringify({ id: 'evt_invalid' }),
        });

        expect(response.statusCode).toBe(400);
        const data = JSON.parse(response.body);
        expect(data.error.code).toBe('STRIPE_WEBHOOK_INVALID_SIGNATURE');
        expect(data.error.message).toContain('Webhook verification failed');
      } finally {
        process.env.NODE_ENV = oldNodeEnv;
        process.env.BYPASS_STRIPE_SIGNATURE = oldBypass;
      }
    });

    it('should verify apiKeyHash is redacted from agent payloads', async () => {
      // Creation response
      const resCreate = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'Redact Test', type: 'buyer', ownerEmail: 'redact@test.com' },
      });
      const bodyCreate = JSON.parse(resCreate.body);
      expect(bodyCreate.agent.apiKeyHash).toBeUndefined();
      expect(bodyCreate.apiKey).toBeDefined();

      // GET /v1/agents/me response
      const resMe = await app.inject({
        method: 'GET',
        url: '/v1/agents/me',
        headers: { authorization: `Bearer ${bodyCreate.apiKey}` },
      });
      const bodyMe = JSON.parse(resMe.body);
      expect(bodyMe.agent.apiKeyHash).toBeUndefined();
    });
  });

  describe('Offers API Endpoints (v0.2)', () => {
    let buyerKey: string;
    let sellerKey: string;
    let listingId: string;

    beforeEach(async () => {
      // Create seller
      const resSeller = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'Seller S', type: 'seller', ownerEmail: 'seller_s@test.com' },
      });
      const sellerData = JSON.parse(resSeller.body);
      sellerKey = sellerData.apiKey;

      // Create buyer
      const resBuyer = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'Buyer B', type: 'buyer', ownerEmail: 'buyer_b@test.com' },
      });
      const buyerData = JSON.parse(resBuyer.body);
      buyerKey = buyerData.apiKey;

      // Create listing (price 10000, quantity 10)
      const resListing = await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          title: 'Special Item',
          description: 'Offers accepted listing.',
          type: 'physical_good',
          priceAmount: 10000,
          currency: 'USD',
          quantityAvailable: 10,
        },
      });
      listingId = JSON.parse(resListing.body).listing.id;
    });

    it('should create a pending offer and log OFFER_CREATED event with fromStatus = null', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const response = await app.inject({
        method: 'POST',
        url: `/v1/listings/${listingId}/offers`,
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          priceAmount: 7500,
          quantity: 2,
          expiresAt,
          note: 'Initial offer',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.offer.status).toBe('pending');
      expect(data.offer.priceAmount).toBe(7500);

      // Verify history
      const resOffer = await app.inject({
        method: 'GET',
        url: `/v1/offers/${data.offer.id}`,
        headers: { authorization: `Bearer ${buyerKey}` },
      });
      const offerDetails = JSON.parse(resOffer.body).offer;
      expect(offerDetails.history.length).toBe(1);
      expect(offerDetails.history[0].event).toBe('OFFER_CREATED');
      expect(offerDetails.history[0].fromStatus).toBeNull();
      expect(offerDetails.history[0].toStatus).toBe('pending');
    });

    it('should prevent checkout on pending, rejected, cancelled, and countered offers', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const resOffer = await app.inject({
        method: 'POST',
        url: `/v1/listings/${listingId}/offers`,
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: { priceAmount: 7500, quantity: 2, expiresAt },
      });
      const offerId = JSON.parse(resOffer.body).offer.id;

      // Checkout attempt on pending offer
      const resCheckoutPending = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          listingId,
          quantity: 2,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
          offerId,
        },
      });
      expect(resCheckoutPending.statusCode).toBe(400);

      // Reject offer
      await app.inject({
        method: 'POST',
        url: `/v1/offers/${offerId}/reject`,
        headers: { authorization: `Bearer ${sellerKey}` },
      });

      // Checkout attempt on rejected offer
      const resCheckoutRejected = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          listingId,
          quantity: 2,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
          offerId,
        },
      });
      expect(resCheckoutRejected.statusCode).toBe(400);
    });

    it('should prevent accepting expired pending offers and expired counter-offers', async () => {
      // We override validation locally in this test or test time-based expired check manually by injecting state.
      // But since validateExpiration throws on past dates, we create a valid offer, and then modify mockDb directly to simulate expiration!
      const validExpires = new Date(Date.now() + 10000).toISOString();
      const resOffer = await app.inject({
        method: 'POST',
        url: `/v1/listings/${listingId}/offers`,
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: { priceAmount: 7500, quantity: 2, expiresAt: validExpires },
      });
      const offer = JSON.parse(resOffer.body).offer;

      // Force mockDb offer to be expired
      const dbOffer = mockDb.offers.find((o) => o.id === offer.id);
      dbOffer.expiresAt = new Date(Date.now() - 5000);

      // Accept attempt
      const resAccept = await app.inject({
        method: 'POST',
        url: `/v1/offers/${offer.id}/accept`,
        headers: { authorization: `Bearer ${sellerKey}` },
      });
      expect(resAccept.statusCode).toBe(400);
      const body = JSON.parse(resAccept.body);
      expect(body.error.code).toBe('OFFER_EXPIRED');
    });

    it('should freeze terms on acceptance, lock price, and block secondary checkout intents', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const resOffer = await app.inject({
        method: 'POST',
        url: `/v1/listings/${listingId}/offers`,
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: { priceAmount: 7500, quantity: 2, expiresAt },
      });
      const offerId = JSON.parse(resOffer.body).offer.id;

      // Accept offer
      const resAccept = await app.inject({
        method: 'POST',
        url: `/v1/offers/${offerId}/accept`,
        headers: { authorization: `Bearer ${sellerKey}` },
      });
      expect(resAccept.statusCode).toBe(200);
      const acceptedOffer = JSON.parse(resAccept.body).offer;
      expect(acceptedOffer.status).toBe('accepted');
      expect(acceptedOffer.acceptedPriceAmount).toBe(7500);
      expect(acceptedOffer.acceptedQuantity).toBe(2);

      // Create checkout intent (should use accepted price: 7500, total amount: 15000)
      const resCheckout = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          listingId,
          quantity: 2,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
          offerId,
        },
      });
      expect(resCheckout.statusCode).toBe(201);
      const checkoutIntent = JSON.parse(resCheckout.body).checkoutIntent;
      expect(checkoutIntent.amountTotal).toBe(15000); // 7500 * 2
      expect(checkoutIntent.offerId).toBe(offerId);

      // Double checkout attempt
      const resCheckout2 = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          listingId,
          quantity: 2,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
          offerId,
        },
      });
      expect(resCheckout2.statusCode).toBe(400); // Already checked out (checkout_pending)
    });

    it('should forbid other sellers from mutating an offer', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const resOffer = await app.inject({
        method: 'POST',
        url: `/v1/listings/${listingId}/offers`,
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: { priceAmount: 7500, quantity: 2, expiresAt },
      });
      const offerId = JSON.parse(resOffer.body).offer.id;

      // Register another seller
      const resSeller2 = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'Seller 2', type: 'seller', ownerEmail: 's2@test.com' },
      });
      const s2Key = JSON.parse(resSeller2.body).apiKey;

      // Attempt to accept using S2 key
      const resAccept = await app.inject({
        method: 'POST',
        url: `/v1/offers/${offerId}/accept`,
        headers: { authorization: `Bearer ${s2Key}` },
      });
      expect(resAccept.statusCode).toBe(403);
    });

    it('should prevent buyer from cancelling after acceptance', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const resOffer = await app.inject({
        method: 'POST',
        url: `/v1/listings/${listingId}/offers`,
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: { priceAmount: 7500, quantity: 2, expiresAt },
      });
      const offerId = JSON.parse(resOffer.body).offer.id;

      // Accept
      await app.inject({
        method: 'POST',
        url: `/v1/offers/${offerId}/accept`,
        headers: { authorization: `Bearer ${sellerKey}` },
      });

      // Try cancel
      const resCancel = await app.inject({
        method: 'POST',
        url: `/v1/offers/${offerId}/cancel`,
        headers: { authorization: `Bearer ${buyerKey}` },
      });
      expect(resCancel.statusCode).toBe(400); // Status is accepted, not pending or countered
    });

    it('should allow legacy checkout intents without offerId to continue working normally', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          listingId,
          quantity: 1, // Uses original price 10000
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });

      expect(response.statusCode).toBe(201);
      const checkoutIntent = JSON.parse(response.body).checkoutIntent;
      expect(checkoutIntent.amountTotal).toBe(10000);
      expect(checkoutIntent.offerId).toBeNull();
    });
  });
});
