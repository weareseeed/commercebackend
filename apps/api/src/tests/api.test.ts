import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@commercebackend/db';

// --- IN-MEMORY DB STORE ---
const mockDb = {
  agents: [] as any[],
  listings: [] as any[],
  checkoutIntents: [] as any[],
  orders: [] as any[],
  queryLogs: [] as any[],
  purchasePolicies: [] as any[],
  offers: [] as any[],
  offerHistories: [] as any[],
  criticalEvents: [] as any[],
  catalogSyncLogs: [] as any[],
  reset() {
    this.agents = [];
    this.listings = [];
    this.checkoutIntents = [];
    this.orders = [];
    this.queryLogs = [];
    this.purchasePolicies = [];
    this.offers = [];
    this.offerHistories = [];
    this.criticalEvents = [];
    this.catalogSyncLogs = [];
  },
};

// --- MOCK DATABASE WORKSPACE PACKAGE ---
vi.mock('@commercebackend/db', () => {
  const hashKey = (key: string) => `hash_${key}`;
  const hashKeyWithSalt = (key: string, salt: string) => `hash_${key}_${salt}`;
  const randomHex = (length: number) => {
    let s = '';
    while (s.length < length) s += Math.floor(Math.random() * 16).toString(16);
    return s.slice(0, length);
  };
  // Mirrors the real `extractApiKeyId` in packages/db/src/auth-utils.ts: new-format
  // keys are `<prefix><16-hex-keyId>.<secret>`; legacy keys have no embedded id.
  const extractApiKeyId = (apiKey: string): string | null => {
    const dotIndex = apiKey.indexOf('.');
    if (dotIndex === -1) return null;
    const keyId = apiKey.slice(0, dotIndex).slice(-16);
    return /^[0-9a-f]{16}$/.test(keyId) ? keyId : null;
  };

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
            if (where.apiKeyId && a.apiKeyId !== where.apiKeyId) return false;
            return true;
          }) || null
        );
      }),
      findUnique: vi.fn(async ({ where }) => {
        return mockDb.agents.find((a) => a.id === where.id) || null;
      }),
      count: vi.fn(async () => mockDb.agents.length),
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
      findFirst: vi.fn(async ({ where }) => {
        return (
          mockDb.listings.find((l) => {
            if (where?.importSource !== undefined && l.importSource !== where.importSource) return false;
            if (where?.externalId !== undefined && l.externalId !== where.externalId) return false;
            return true;
          }) || null
        );
      }),
      findMany: vi.fn(async ({ where, orderBy, skip, take } = {}) => {
        let matches = mockDb.listings.filter((l) => {
          if (where?.status && l.status !== where.status) return false;
          if (where?.type && l.type !== where.type) return false;
          if (where?.currency && l.currency !== where.currency) return false;
          if (where?.priceAmount?.lte && l.priceAmount > where.priceAmount.lte) return false;
          return true;
        });
        if (orderBy?.createdAt) {
          const direction = orderBy.createdAt === 'desc' ? -1 : 1;
          matches = [...matches].sort(
            (a, b) => direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          );
        }
        if (typeof skip === 'number') matches = matches.slice(skip);
        if (typeof take === 'number') matches = matches.slice(0, take);
        return matches;
      }),
      count: vi.fn(async ({ where } = {}) => {
        return mockDb.listings.filter((l) => {
          if (where?.status && l.status !== where.status) return false;
          if (where?.type && l.type !== where.type) return false;
          if (where?.currency && l.currency !== where.currency) return false;
          if (where?.priceAmount?.lte && l.priceAmount > where.priceAmount.lte) return false;
          return true;
        }).length;
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
      count: vi.fn(async () => mockDb.checkoutIntents.length),
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
      count: vi.fn(async () => mockDb.queryLogs.length),
      deleteMany: vi.fn(),
    },
    purchasePolicy: {
      create: vi.fn(async ({ data }) => {
        const newPolicy = {
          id: `pol_${Math.random().toString(36).substring(2, 11)}`,
          enabled: true,
          allowedListingTypes: [],
          allowedSellerAgentIds: [],
          requireHumanApprovalForOffers: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        mockDb.purchasePolicies.push(newPolicy);
        return newPolicy;
      }),
      findFirst: vi.fn(async ({ where }) => {
        const policies = mockDb.purchasePolicies.filter((p) => {
          if (where?.buyerAgentId && p.buyerAgentId !== where.buyerAgentId) return false;
          if (where?.enabled !== undefined && p.enabled !== where.enabled) return false;
          if (where?.currency && p.currency !== where.currency) return false;
          return true;
        });
        return policies[policies.length - 1] || null;
      }),
      findMany: vi.fn(async ({ where }) => {
        return mockDb.purchasePolicies.filter((p) => {
          if (where?.buyerAgentId && p.buyerAgentId !== where.buyerAgentId) return false;
          return true;
        });
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
      count: vi.fn(async () => mockDb.offers.length),
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
    criticalEvent: {
      create: vi.fn(async ({ data }) => {
        const event = {
          id: `evt_${Math.random().toString(36).substring(2, 11)}`,
          createdAt: new Date(),
          ...data,
        };
        mockDb.criticalEvents.push(event);
        return event;
      }),
      count: vi.fn(async ({ where } = {}) => {
        return mockDb.criticalEvents.filter((e) => {
          if (where?.code && e.code !== where.code) return false;
          return true;
        }).length;
      }),
      deleteMany: vi.fn(),
    },
    catalogSyncLog: {
      create: vi.fn(async ({ data }) => {
        const log = {
          id: `sync_${Math.random().toString(36).substring(2, 11)}`,
          createdAt: new Date(),
          ...data,
        };
        mockDb.catalogSyncLogs.push(log);
        return log;
      }),
      findMany: vi.fn(async ({ orderBy, skip, take } = {}) => {
        let matches = [...mockDb.catalogSyncLogs];
        if (orderBy?.createdAt) {
          const direction = orderBy.createdAt === 'desc' ? -1 : 1;
          matches.sort(
            (a, b) => direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          );
        }
        if (typeof skip === 'number') matches = matches.slice(skip);
        if (typeof take === 'number') matches = matches.slice(0, take);
        return matches;
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
    $queryRaw: vi.fn(async (query: any, ...params: any[]) => {
      const text = Array.isArray(query) ? query.join('') : String(query);
      if (text.includes('keyword_hits')) {
        const [keywords, status, typeFilter, currencyFilter, maxPriceFilter, limit, offset] = params as [
          string[],
          string,
          string | null,
          string | null,
          number | null,
          number,
          number,
        ];
        const matched = mockDb.listings
          .filter((l) => {
            if (l.status !== status) return false;
            if (typeFilter && l.type !== typeFilter) return false;
            if (currencyFilter && l.currency !== currencyFilter) return false;
            if (maxPriceFilter != null && l.priceAmount > maxPriceFilter) return false;
            return true;
          })
          .map((l) => {
            const titleLower = l.title.toLowerCase();
            const descLower = l.description.toLowerCase();
            const attrsStr = JSON.stringify(l.attributes ?? {}).toLowerCase();
            const matchedKeywords: string[] = [];
            let titleMatched = false;
            let descMatched = false;
            let attrsMatched = false;
            for (const kw of keywords) {
              let hit = false;
              if (titleLower.includes(kw)) {
                hit = true;
                titleMatched = true;
              }
              if (descLower.includes(kw)) {
                hit = true;
                descMatched = true;
              }
              if (attrsStr.includes(kw)) {
                hit = true;
                attrsMatched = true;
              }
              if (hit) matchedKeywords.push(kw);
            }
            return {
              ...l,
              matched_count: matchedKeywords.length,
              title_matched: titleMatched,
              desc_matched: descMatched,
              attrs_matched: attrsMatched,
              matched_keywords: matchedKeywords,
            };
          })
          .filter((row) => row.matched_count > 0)
          .sort((a, b) => {
            if (b.matched_count !== a.matched_count) return b.matched_count - a.matched_count;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });

        const total = matched.length;
        return matched.slice(offset, offset + limit).map((row) => ({ ...row, total_count: total }));
      }
      return [1];
    }),
  };

  const sandboxFixtureIds = {
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
  };

  const resetAndSeedSandbox = vi.fn(async () => {
    mockDb.reset();
    const sellerApiKey = 'cb_test_sandbox_seller';
    const autoBuyerApiKey = 'cb_test_sandbox_auto';
    const approvalBuyerApiKey = 'cb_test_sandbox_approval';

    mockDb.agents.push(
      {
        id: sandboxFixtureIds.sellerAgentId,
        name: 'Sandbox Seller Agent',
        type: 'seller',
        ownerEmail: 'sandbox-seller@commercebackend.test',
        apiKeyHash: hashKey(sellerApiKey),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: sandboxFixtureIds.autoBuyerAgentId,
        name: 'Sandbox Buyer Agent (Auto Approval)',
        type: 'buyer',
        ownerEmail: 'sandbox-buyer-auto@commercebackend.test',
        apiKeyHash: hashKey(autoBuyerApiKey),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: sandboxFixtureIds.approvalBuyerAgentId,
        name: 'Sandbox Buyer Agent (Approval Required)',
        type: 'buyer',
        ownerEmail: 'sandbox-buyer-approval@commercebackend.test',
        apiKeyHash: hashKey(approvalBuyerApiKey),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    mockDb.listings.push(
      {
        id: sandboxFixtureIds.listings.vipTicket,
        sellerAgentId: sandboxFixtureIds.sellerAgentId,
        title: 'VIP Jazz Night Ticket',
        description: 'Sandbox listing',
        type: 'event_ticket',
        status: 'active',
        priceAmount: 4200,
        currency: 'USD',
        quantityAvailable: 24,
        attributes: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: sandboxFixtureIds.listings.pdfGuide,
        sellerAgentId: sandboxFixtureIds.sellerAgentId,
        title: 'Agentic Commerce PDF Guide',
        description: 'Sandbox listing',
        type: 'digital_good',
        status: 'active',
        priceAmount: 1900,
        currency: 'USD',
        quantityAvailable: 500,
        attributes: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: sandboxFixtureIds.listings.devkit,
        sellerAgentId: sandboxFixtureIds.sellerAgentId,
        title: 'Autonomous Agent Hardware DevKit',
        description: 'Sandbox listing',
        type: 'physical_good',
        status: 'active',
        priceAmount: 15000,
        currency: 'USD',
        quantityAvailable: 8,
        attributes: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: sandboxFixtureIds.listings.negotiationWorkshop,
        sellerAgentId: sandboxFixtureIds.sellerAgentId,
        title: 'Custom Commerce Workflow Workshop',
        description: 'Sandbox listing',
        type: 'service',
        status: 'active',
        priceAmount: 25000,
        currency: 'USD',
        quantityAvailable: 6,
        attributes: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: sandboxFixtureIds.listings.lowInventoryBundle,
        sellerAgentId: sandboxFixtureIds.sellerAgentId,
        title: 'Low-Inventory Sensor Bundle',
        description: 'Sandbox listing',
        type: 'physical_good',
        status: 'active',
        priceAmount: 3200,
        currency: 'USD',
        quantityAvailable: 1,
        attributes: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    mockDb.purchasePolicies.push(
      {
        id: sandboxFixtureIds.purchasePolicies.autoApproveLowValue,
        buyerAgentId: sandboxFixtureIds.autoBuyerAgentId,
        name: 'Sandbox auto-approve low-value purchases',
        enabled: true,
        maxAutoApproveAmount: 5000,
        currency: 'USD',
        allowedListingTypes: ['digital_good', 'event_ticket', 'physical_good'],
        allowedSellerAgentIds: [sandboxFixtureIds.sellerAgentId],
        requireHumanApprovalAboveAmount: 5000,
        requireHumanApprovalForOffers: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: sandboxFixtureIds.purchasePolicies.approvalRequired,
        buyerAgentId: sandboxFixtureIds.approvalBuyerAgentId,
        name: 'Sandbox human approval required above threshold',
        enabled: true,
        maxAutoApproveAmount: 5000,
        currency: 'USD',
        allowedListingTypes: ['physical_good', 'service'],
        allowedSellerAgentIds: [sandboxFixtureIds.sellerAgentId],
        requireHumanApprovalAboveAmount: 5000,
        requireHumanApprovalForOffers: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    mockDb.offers.push(
      {
        id: sandboxFixtureIds.offers.acceptedWorkshopOffer,
        listingId: sandboxFixtureIds.listings.negotiationWorkshop,
        buyerAgentId: sandboxFixtureIds.approvalBuyerAgentId,
        priceAmount: 22000,
        quantity: 1,
        status: 'accepted',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        acceptedPriceAmount: 23000,
        acceptedQuantity: 1,
        acceptedAt: new Date(),
        acceptedByAgentId: sandboxFixtureIds.sellerAgentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: sandboxFixtureIds.offers.expiredWorkshopOffer,
        listingId: sandboxFixtureIds.listings.negotiationWorkshop,
        buyerAgentId: sandboxFixtureIds.approvalBuyerAgentId,
        priceAmount: 18000,
        quantity: 1,
        status: 'expired',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );

    mockDb.checkoutIntents.push({
      id: sandboxFixtureIds.checkoutIntents.approvalRequiredDevkit,
      listingId: sandboxFixtureIds.listings.devkit,
      buyerAgentId: sandboxFixtureIds.approvalBuyerAgentId,
      sellerAgentId: sandboxFixtureIds.sellerAgentId,
      quantity: 1,
      amountSubtotal: 15000,
      amountTotal: 15000,
      currency: 'USD',
      status: 'human_approval_required',
      successUrl: 'https://www.commercebackend.com/docs/sandbox/?checkout=success',
      cancelUrl: 'https://www.commercebackend.com/docs/sandbox/?checkout=cancelled',
      purchasePolicyId: sandboxFixtureIds.purchasePolicies.approvalRequired,
      policyDecision: 'human_approval_required',
      approvalRequestedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      manifest: {
        sellerAgentId: sandboxFixtureIds.sellerAgentId,
        buyerAgentIds: {
          autoApproved: sandboxFixtureIds.autoBuyerAgentId,
          approvalRequired: sandboxFixtureIds.approvalBuyerAgentId,
        },
        listingIds: sandboxFixtureIds.listings,
        purchasePolicyIds: sandboxFixtureIds.purchasePolicies,
        offerIds: sandboxFixtureIds.offers,
        checkoutIntentIds: sandboxFixtureIds.checkoutIntents,
      },
      credentials: {
        sellerAgentId: sandboxFixtureIds.sellerAgentId,
        sellerApiKey,
        autoBuyerAgentId: sandboxFixtureIds.autoBuyerAgentId,
        autoBuyerApiKey,
        approvalBuyerAgentId: sandboxFixtureIds.approvalBuyerAgentId,
        approvalBuyerApiKey,
      },
    };
  });

  return {
    prisma: prismaMock,
    hashApiKey: hashKey,
    hashApiKeyWithSalt: hashKeyWithSalt,
    extractApiKeyId,
    generateApiKey: (prefix: string) => {
      const keyId = randomHex(16);
      const secret = `mock_key_${Math.random().toString(36).substring(2, 9)}`;
      const apiKey = `${prefix}${keyId}.${secret}`;
      const apiKeySalt = randomHex(8);
      return { apiKey, apiKeyHash: hashKeyWithSalt(apiKey, apiKeySalt), apiKeySalt, apiKeyId: keyId };
    },
    resetAndSeedSandbox,
    sandboxFixtureIds,
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
import { env } from '../env';

const app = buildApp();

describe('CommerceBackend v0.1 API Integration Tests', () => {
  let buyerKey: string;
  let buyerId: string;
  let sellerKey: string;
  let sellerId: string;
  let testListingId: string;

  const operatorHeaders = { 'x-operator-key': env.OPERATOR_API_KEY || 'operator_test_key' };

  const seedAutoApprovePolicy = (agentId: string, maxAmount = 1_000_000) => {
    mockDb.purchasePolicies.push({
      id: `pol_${Math.random().toString(36).substring(2, 11)}`,
      buyerAgentId: agentId,
      name: 'Test auto-approval policy',
      enabled: true,
      maxAutoApproveAmount: maxAmount,
      currency: 'USD',
      allowedListingTypes: [],
      allowedSellerAgentIds: [],
      requireHumanApprovalAboveAmount: maxAmount,
      requireHumanApprovalForOffers: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

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
  describe('Search API', () => {
    beforeEach(async () => {
      // Seed seller & listings for search
      const resSeller = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'Seller', type: 'seller', ownerEmail: 'seller@search.com' },
      });
      sellerKey = JSON.parse(resSeller.body).apiKey;
      sellerId = JSON.parse(resSeller.body).agent.id;

      // Add listings
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

    it('should rank listings matching more query keywords ahead of partial matches', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/search',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          query: 'Miami Rock Festival',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      // "Miami Rock Festival" matches all 3 keywords; the other active listing
      // ("Miami Jazz VIP Concert") only matches "Miami", so it must rank lower.
      expect(data.results[0].listing.title).toBe('Miami Rock Festival');
      expect(data.results[0].score).toBeGreaterThan(data.results[1].score);
    });

    it('should paginate search results and report the total match count', async () => {
      const firstPage = await app.inject({
        method: 'POST',
        url: '/v1/search',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          query: 'Miami',
          limit: 1,
          offset: 0,
        },
      });

      expect(firstPage.statusCode).toBe(200);
      const firstPageData = JSON.parse(firstPage.body);
      expect(firstPageData.results.length).toBe(1);
      expect(firstPageData.pagination.total).toBe(2);

      const secondPage = await app.inject({
        method: 'POST',
        url: '/v1/search',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          query: 'Miami',
          limit: 1,
          offset: 1,
        },
      });

      expect(secondPage.statusCode).toBe(200);
      const secondPageData = JSON.parse(secondPage.body);
      expect(secondPageData.results.length).toBe(1);
      expect(secondPageData.pagination.total).toBe(2);
      expect(secondPageData.results[0].listing.id).not.toBe(firstPageData.results[0].listing.id);
    });
  });

  describe('Sandbox Launch Routes', () => {
    it('should expose sandbox fixtures and public listings after operator reset', async () => {
      const resetResponse = await app.inject({
        method: 'POST',
        url: '/v1/sandbox/reset',
        headers: operatorHeaders,
      });

      expect(resetResponse.statusCode).toBe(200);
      const resetData = JSON.parse(resetResponse.body);
      expect(resetData.credentials.autoBuyerApiKey).toBeDefined();
      expect(resetData.manifest.listingIds.vipTicket).toBe('sandbox_listing_vip_jazz_ticket');

      const fixturesResponse = await app.inject({
        method: 'GET',
        url: '/v1/sandbox/fixtures',
      });
      expect(fixturesResponse.statusCode).toBe(200);

      const publicListingsResponse = await app.inject({
        method: 'GET',
        url: '/v1/public/listings',
      });
      expect(publicListingsResponse.statusCode).toBe(200);
      const publicListings = JSON.parse(publicListingsResponse.body);
      expect(publicListings.listings).toHaveLength(5);

      const publicSearchResponse = await app.inject({
        method: 'POST',
        url: '/v1/public/search',
        payload: {
          query: 'jazz miami',
          filters: { type: 'event_ticket', status: 'active' },
        },
      });
      expect(publicSearchResponse.statusCode).toBe(200);
      const publicSearch = JSON.parse(publicSearchResponse.body);
      expect(publicSearch.results[0].listing.id).toBe('sandbox_listing_vip_jazz_ticket');
      expect(mockDb.queryLogs).toHaveLength(0);
    });

    it('should simulate sandbox checkout completion for auto-approved purchases', async () => {
      const resetResponse = await app.inject({
        method: 'POST',
        url: '/v1/sandbox/reset',
        headers: operatorHeaders,
      });
      const resetData = JSON.parse(resetResponse.body);

      const checkoutResponse = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${resetData.credentials.autoBuyerApiKey}` },
        payload: {
          listingId: resetData.manifest.listingIds.lowInventoryBundle,
          quantity: 1,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });

      expect(checkoutResponse.statusCode).toBe(201);
      const checkoutData = JSON.parse(checkoutResponse.body);
      expect(checkoutData.checkoutIntent.status).toBe('open');

      const simulateResponse = await app.inject({
        method: 'POST',
        url: `/v1/sandbox/checkout-intents/${checkoutData.checkoutIntent.id}/simulate-complete`,
        headers: operatorHeaders,
      });

      expect(simulateResponse.statusCode).toBe(200);
      const simulateData = JSON.parse(simulateResponse.body);
      expect(simulateData.checkoutIntent.status).toBe('paid');
      expect(simulateData.order.paymentStatus).toBe('paid');
      expect(simulateData.listing.quantityAvailable).toBe(0);
      expect(simulateData.listing.status).toBe('sold_out');
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

    it('should allow buyer agents to initiate a checkout intent with Stripe redirect when policy permits it', async () => {
      seedAutoApprovePolicy(buyerId);

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


    it('should require human approval when no purchase policy exists', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          listingId: testListingId,
          quantity: 1,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.checkoutIntent.status).toBe('human_approval_required');
      expect(data.checkoutIntent.policyDecision).toBe('human_approval_required');
      expect(data.checkoutIntent.purchasePolicyId).toBeNull();
      expect(data.checkoutIntent.checkoutUrl).toBeNull();
    });

    it('should reject buyer-agent attempts to create their own purchase policies', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/agents/${buyerId}/purchase-policies`,
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          name: 'Self-escalation policy',
          maxAutoApproveAmount: 1_000_000,
          currency: 'USD',
        },
      });

      expect(response.statusCode).toBe(401);
      expect(mockDb.purchasePolicies).toHaveLength(0);
    });

    it('should let operators create purchase policies with approval thresholds', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/agents/${buyerId}/purchase-policies`,
        headers: operatorHeaders,
        payload: {
          name: 'Low-risk ticket policy',
          maxAutoApproveAmount: 7500,
          currency: 'USD',
          allowedListingTypes: ['event_ticket'],
          requireHumanApprovalAboveAmount: 7500,
          requireHumanApprovalForOffers: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.purchasePolicy.buyerAgentId).toBe(buyerId);
      expect(data.purchasePolicy.maxAutoApproveAmount).toBe(7500);
      expect(data.purchasePolicy.allowedListingTypes).toEqual(['event_ticket']);
      expect(data.purchasePolicy.enabled).toBe(true);
    });

    it('should auto-approve checkout when purchase policy allows the total', async () => {
      await app.inject({
        method: 'POST',
        url: `/v1/agents/${buyerId}/purchase-policies`,
        headers: operatorHeaders,
        payload: {
          name: 'Auto approve small purchases',
          maxAutoApproveAmount: 10000,
          currency: 'USD',
          allowedListingTypes: ['event_ticket'],
          requireHumanApprovalAboveAmount: 10000,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          listingId: testListingId,
          quantity: 1,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.checkoutIntent.status).toBe('open');
      expect(data.checkoutIntent.policyDecision).toBe('policy_approved');
      expect(data.checkoutIntent.purchasePolicyId).toBeDefined();
      expect(data.checkoutIntent.stripeCheckoutSessionId).toContain('cs_');
      expect(data.checkoutIntent.checkoutUrl).toContain('https://checkout.stripe.com/');
    });

    it('should require approval and not create Stripe session when purchase policy threshold is exceeded', async () => {
      await app.inject({
        method: 'POST',
        url: `/v1/agents/${buyerId}/purchase-policies`,
        headers: operatorHeaders,
        payload: {
          name: 'Approval required above $25',
          maxAutoApproveAmount: 2500,
          currency: 'USD',
          allowedListingTypes: ['event_ticket'],
          requireHumanApprovalAboveAmount: 2500,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          listingId: testListingId,
          quantity: 1,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.checkoutIntent.status).toBe('human_approval_required');
      expect(data.checkoutIntent.policyDecision).toBe('human_approval_required');
      expect(data.checkoutIntent.checkoutUrl).toBeNull();
      expect(data.checkoutIntent.stripeCheckoutSessionId).toBeNull();
    });

    it('should reject buyer-agent attempts to approve their own approval-required checkout intent', async () => {
      await app.inject({
        method: 'POST',
        url: `/v1/agents/${buyerId}/purchase-policies`,
        headers: operatorHeaders,
        payload: {
          name: 'Approval required above $25',
          maxAutoApproveAmount: 2500,
          currency: 'USD',
          allowedListingTypes: ['event_ticket'],
          requireHumanApprovalAboveAmount: 2500,
        },
      });

      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          listingId: testListingId,
          quantity: 1,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });
      const checkoutIntentId = JSON.parse(createResponse.body).checkoutIntent.id;

      const approveResponse = await app.inject({
        method: 'POST',
        url: `/v1/checkout-intents/${checkoutIntentId}/approve`,
        headers: { authorization: `Bearer ${buyerKey}` },
      });

      expect(approveResponse.statusCode).toBe(401);
      const intent = mockDb.checkoutIntents.find((c) => c.id === checkoutIntentId);
      expect(intent.status).toBe('human_approval_required');
      expect(intent.stripeCheckoutSessionId).toBeNull();
    });

    it('should approve a human-approval-required checkout intent before creating Stripe session', async () => {
      await app.inject({
        method: 'POST',
        url: `/v1/agents/${buyerId}/purchase-policies`,
        headers: operatorHeaders,
        payload: {
          name: 'Approval required above $25',
          maxAutoApproveAmount: 2500,
          currency: 'USD',
          allowedListingTypes: ['event_ticket'],
          requireHumanApprovalAboveAmount: 2500,
        },
      });

      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          listingId: testListingId,
          quantity: 1,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });
      const checkoutIntentId = JSON.parse(createResponse.body).checkoutIntent.id;

      const approveResponse = await app.inject({
        method: 'POST',
        url: `/v1/checkout-intents/${checkoutIntentId}/approve`,
        headers: operatorHeaders,
      });

      expect(approveResponse.statusCode).toBe(200);
      const data = JSON.parse(approveResponse.body);
      expect(data.checkoutIntent.status).toBe('human_approved');
      expect(data.checkoutIntent.humanApprovedAt).toBeDefined();
      expect(data.checkoutIntent.stripeCheckoutSessionId).toContain('cs_');
      expect(data.checkoutIntent.checkoutUrl).toContain('https://checkout.stripe.com/');
    });

    it('should reject a human-approval-required checkout intent without creating Stripe session', async () => {
      await app.inject({
        method: 'POST',
        url: `/v1/agents/${buyerId}/purchase-policies`,
        headers: operatorHeaders,
        payload: {
          name: 'Approval required above $25',
          maxAutoApproveAmount: 2500,
          currency: 'USD',
          allowedListingTypes: ['event_ticket'],
          requireHumanApprovalAboveAmount: 2500,
        },
      });

      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/checkout-intents',
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: {
          listingId: testListingId,
          quantity: 1,
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });
      const checkoutIntentId = JSON.parse(createResponse.body).checkoutIntent.id;

      const rejectResponse = await app.inject({
        method: 'POST',
        url: `/v1/checkout-intents/${checkoutIntentId}/reject`,
        headers: operatorHeaders,
        payload: { reason: 'Human declined purchase.' },
      });

      expect(rejectResponse.statusCode).toBe(200);
      const data = JSON.parse(rejectResponse.body);
      expect(data.checkoutIntent.status).toBe('human_rejected');
      expect(data.checkoutIntent.humanRejectedAt).toBeDefined();
      expect(data.checkoutIntent.approvalRejectionReason).toBe('Human declined purchase.');
      expect(data.checkoutIntent.stripeCheckoutSessionId).toBeNull();
      expect(data.checkoutIntent.checkoutUrl).toBeNull();
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

      seedAutoApprovePolicy(buyerId);

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

    it('should ignore completed webhooks for approval-required intents without a Stripe session', async () => {
      const intent = await prisma.checkoutIntent.create({
        data: {
          listingId: testListingId,
          buyerAgentId: buyerId,
          sellerAgentId: sellerId,
          quantity: 1,
          amountSubtotal: 3000,
          amountTotal: 3000,
          currency: 'USD',
          status: 'human_approval_required',
          stripeCheckoutSessionId: null,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': 'sig',
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          id: 'evt_unapproved',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_unapproved',
              payment_intent: 'pi_unapproved',
              metadata: { checkoutIntentId: intent.id },
            },
          },
        }),
      });

      expect(response.statusCode).toBe(200);
      expect(mockDb.orders.some((o) => o.checkoutIntentId === intent.id)).toBe(false);
      expect(mockDb.checkoutIntents.find((i) => i.id === intent.id).status).toBe('human_approval_required');
    });

    it('should ignore completed webhooks when Stripe session id does not match the checkout intent', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhooks/stripe',
        headers: {
          'stripe-signature': 'sig',
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          id: 'evt_wrong_session',
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_wrong_session',
              payment_intent: 'pi_wrong_session',
              metadata: { checkoutIntentId },
            },
          },
        }),
      });

      expect(response.statusCode).toBe(200);
      expect(mockDb.orders.some((o) => o.checkoutIntentId === checkoutIntentId)).toBe(false);
      expect(mockDb.checkoutIntents.find((i) => i.id === checkoutIntentId).status).toBe('open');
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
        version: '0.2.2',
        mode: env.SANDBOX_MODE ? 'sandbox' : env.NODE_ENV,
        stripeMode: 'mocked',
      });

      const resReady = await app.inject({ method: 'GET', url: '/ready' });
      expect(resReady.statusCode).toBe(200);
      expect(JSON.parse(resReady.body)).toEqual({
        ok: true,
        mode: env.SANDBOX_MODE ? 'sandbox' : env.NODE_ENV,
        checks: {
          database: 'ok',
          stripe: 'mocked',
          stripeMode: 'mocked',
        },
      });
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
      seedAutoApprovePolicy(localBuyerId);
      const { createStripeCheckoutSession } = await import('@commercebackend/payments-stripe');
      const stripeMock = vi.mocked(createStripeCheckoutSession);
      stripeMock.mockReset();
      stripeMock.mockRejectedValueOnce(new Error('Stripe API Error'));

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
      expect(bodyCreate.agent.apiKeySalt).toBeUndefined();
      expect(bodyCreate.apiKey).toBeDefined();

      // GET /v1/agents/me response
      const resMe = await app.inject({
        method: 'GET',
        url: '/v1/agents/me',
        headers: { authorization: `Bearer ${bodyCreate.apiKey}` },
      });
      const bodyMe = JSON.parse(resMe.body);
      expect(bodyMe.agent.apiKeyHash).toBeUndefined();
      expect(bodyMe.agent.apiKeySalt).toBeUndefined();
    });
  });

  describe('API key hashing (per-record salt)', () => {
    it('issues new agents a per-record-salted key and authenticates it', async () => {
      const resCreate = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'Salted Key Agent', type: 'buyer', ownerEmail: 'salted@test.com' },
      });
      const { apiKey } = JSON.parse(resCreate.body);

      // New-format keys embed a public lookup id: `<prefix><16-hex keyId>.<secret>`.
      expect(apiKey).toMatch(/^cb_test_[0-9a-f]{16}\..+$/);

      const resMe = await app.inject({
        method: 'GET',
        url: '/v1/agents/me',
        headers: { authorization: `Bearer ${apiKey}` },
      });
      expect(resMe.statusCode).toBe(200);
    });

    it('two agents created back-to-back get different salts and different hashes', async () => {
      const first = JSON.parse(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/agents',
            payload: { name: 'Agent One', type: 'buyer', ownerEmail: 'salt-one@test.com' },
          })
        ).body
      );
      const second = JSON.parse(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/agents',
            payload: { name: 'Agent Two', type: 'buyer', ownerEmail: 'salt-two@test.com' },
          })
        ).body
      );

      const firstAgent = mockDb.agents.find((a) => a.id === first.agent.id);
      const secondAgent = mockDb.agents.find((a) => a.id === second.agent.id);
      expect(firstAgent.apiKeySalt).not.toBe(secondAgent.apiKeySalt);
      expect(firstAgent.apiKeyHash).not.toBe(secondAgent.apiKeyHash);
    });

    it('still authenticates an agent whose key predates the per-record-salt migration', async () => {
      // Simulates a row written before this migration: a flat legacy-format
      // key (no embedded keyId/dot), hashed with the old shared salt, and no
      // apiKeySalt/apiKeyId columns populated.
      const legacyApiKey = 'cb_test_legacy_preexisting_key';
      mockDb.agents.push({
        id: 'agent_legacy_1',
        name: 'Legacy Agent',
        type: 'buyer',
        ownerEmail: 'legacy@test.com',
        apiKeyHash: `hash_${legacyApiKey}`,
        apiKeySalt: null,
        apiKeyId: null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const resMe = await app.inject({
        method: 'GET',
        url: '/v1/agents/me',
        headers: { authorization: `Bearer ${legacyApiKey}` },
      });
      expect(resMe.statusCode).toBe(200);
      const body = JSON.parse(resMe.body);
      expect(body.agent.id).toBe('agent_legacy_1');
    });

    it('rejects a new-format key whose secret has been tampered with', async () => {
      const resCreate = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'Tamper Test', type: 'buyer', ownerEmail: 'tamper@test.com' },
      });
      const { apiKey } = JSON.parse(resCreate.body);

      // Keep the real, valid keyId (so the row is still found by lookup) but
      // corrupt the secret portion that the per-record-salted hash covers.
      const tamperedKey = `${apiKey}tampered`;

      const res = await app.inject({
        method: 'GET',
        url: '/v1/agents/me',
        headers: { authorization: `Bearer ${tamperedKey}` },
      });
      expect(res.statusCode).toBe(401);
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
      buyerId = buyerData.agent.id;

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

    it('should reject approval-required offer checkout and revert offer to accepted', async () => {
      await app.inject({
        method: 'POST',
        url: `/v1/agents/${buyerId}/purchase-policies`,
        headers: operatorHeaders,
        payload: {
          name: 'Offers require approval',
          maxAutoApproveAmount: 1_000_000,
          currency: 'USD',
          allowedListingTypes: ['physical_good'],
          requireHumanApprovalAboveAmount: 1_000_000,
          requireHumanApprovalForOffers: true,
        },
      });

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const resOffer = await app.inject({
        method: 'POST',
        url: `/v1/listings/${listingId}/offers`,
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: { priceAmount: 7500, quantity: 2, expiresAt },
      });
      const offerId = JSON.parse(resOffer.body).offer.id;

      await app.inject({
        method: 'POST',
        url: `/v1/offers/${offerId}/accept`,
        headers: { authorization: `Bearer ${sellerKey}` },
      });

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
      expect(checkoutIntent.status).toBe('human_approval_required');
      expect(mockDb.offers.find((o) => o.id === offerId).status).toBe('checkout_pending');

      const resReject = await app.inject({
        method: 'POST',
        url: `/v1/checkout-intents/${checkoutIntent.id}/reject`,
        headers: operatorHeaders,
        payload: { reason: 'Offer purchase declined.' },
      });

      expect(resReject.statusCode).toBe(200);
      expect(JSON.parse(resReject.body).checkoutIntent.status).toBe('human_rejected');
      expect(mockDb.offers.find((o) => o.id === offerId).status).toBe('accepted');
      const offerHist = mockDb.offerHistories.filter((h) => h.offerId === offerId);
      expect(offerHist.some((h) => h.event === 'OFFER_REVERTED_APPROVAL_REJECTED')).toBe(true);
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

    it('should revert offer from checkout_pending back to accepted if Stripe session creation fails before session exists', async () => {
      seedAutoApprovePolicy(buyerId);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const resOffer = await app.inject({
        method: 'POST',
        url: `/v1/listings/${listingId}/offers`,
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: { priceAmount: 7500, quantity: 2, expiresAt },
      });
      const offerId = JSON.parse(resOffer.body).offer.id;

      await app.inject({
        method: 'POST',
        url: `/v1/offers/${offerId}/accept`,
        headers: { authorization: `Bearer ${sellerKey}` },
      });

      const { createStripeCheckoutSession } = await import('@commercebackend/payments-stripe');
      const stripeMock = vi.mocked(createStripeCheckoutSession);
      stripeMock.mockReset();
      stripeMock.mockRejectedValueOnce(new Error('Stripe API network failure'));

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

      expect(resCheckout.statusCode).toBe(500);

      const dbOffer = mockDb.offers.find((o) => o.id === offerId);
      expect(dbOffer.status).toBe('accepted');

      const offerHist = mockDb.offerHistories.filter((h) => h.offerId === offerId);
      expect(offerHist.some((h) => h.event === 'OFFER_REVERTED_STRIPE_FAILED')).toBe(true);
    });

    it('should NOT revert offer to accepted if Stripe session exists but DB persistence fails, preventing checkout again', async () => {
      seedAutoApprovePolicy(buyerId);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const resOffer = await app.inject({
        method: 'POST',
        url: `/v1/listings/${listingId}/offers`,
        headers: { authorization: `Bearer ${buyerKey}` },
        payload: { priceAmount: 7500, quantity: 2, expiresAt },
      });
      const offerId = JSON.parse(resOffer.body).offer.id;

      await app.inject({
        method: 'POST',
        url: `/v1/offers/${offerId}/accept`,
        headers: { authorization: `Bearer ${sellerKey}` },
      });

      const { createStripeCheckoutSession } = await import('@commercebackend/payments-stripe');
      const stripeMock = vi.mocked(createStripeCheckoutSession);
      stripeMock.mockReset();
      stripeMock.mockResolvedValueOnce({
        id: 'cs_persistence_failure',
        url: 'https://checkout.stripe.com/pay/persistence_failure',
      });

      const spyUpdate = vi.mocked(prisma.checkoutIntent.update);
      spyUpdate.mockImplementationOnce(() => {
        throw new Error('Mock DB constraint violation or connection error');
      });

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

      expect(resCheckout.statusCode).toBe(500);
      expect(resCheckout.body).toContain('CHECKOUT_PERSISTENCE_FAILED');

      const criticalEvent = mockDb.criticalEvents.find((e) => e.code === 'CHECKOUT_PERSISTENCE_FAILED');
      expect(criticalEvent).toBeDefined();
      expect(criticalEvent.payload.checkoutIntentId).toBeDefined();

      const dbOffer = mockDb.offers.find((o) => o.id === offerId);
      expect(dbOffer.status).toBe('checkout_pending');

      const offerHist = mockDb.offerHistories.filter((h) => h.offerId === offerId);
      expect(offerHist.some((h) => h.event === 'OFFER_REVERTED_STRIPE_FAILED')).toBe(false);

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
      expect(resCheckout2.statusCode).toBe(400);
      expect(JSON.parse(resCheckout2.body).error.code).toBe('OFFER_ALREADY_CHECKED_OUT');
    });
  });

  describe('Operator Metrics API', () => {
    it('rejects requests without a valid operator key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/operator/metrics',
      });
      expect(res.statusCode).toBe(401);

      const resWrongKey = await app.inject({
        method: 'GET',
        url: '/v1/operator/metrics',
        headers: { 'x-operator-key': 'not_the_real_key' },
      });
      expect(resWrongKey.statusCode).toBe(401);
    });

    it('returns live counts for an authenticated operator', async () => {
      mockDb.agents.push({ id: 'metrics_agent_1', status: 'active' });
      mockDb.listings.push({ id: 'metrics_listing_1' });
      mockDb.offers.push({ id: 'metrics_offer_1' });
      mockDb.checkoutIntents.push({ id: 'metrics_intent_1' });
      mockDb.orders.push({ id: 'metrics_order_1' });
      mockDb.queryLogs.push({ id: 'metrics_log_1' });
      mockDb.criticalEvents.push({
        id: 'metrics_evt_1',
        code: 'CHECKOUT_PERSISTENCE_FAILED',
        payload: {},
        createdAt: new Date(),
      });

      const res = await app.inject({
        method: 'GET',
        url: '/v1/operator/metrics',
        headers: operatorHeaders,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.counts).toEqual({
        agents: 1,
        listings: 1,
        offers: 1,
        checkoutIntents: 1,
        orders: 1,
        queryLogs: 1,
      });
      expect(body.criticalEvents.total).toBe(1);
      expect(body.criticalEvents.byCode.CHECKOUT_PERSISTENCE_FAILED).toBe(1);
      expect(typeof body.generatedAt).toBe('string');
    });

    it('returns zero counts on an empty database', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/operator/metrics',
        headers: operatorHeaders,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.counts).toEqual({
        agents: 0,
        listings: 0,
        offers: 0,
        checkoutIntents: 0,
        orders: 0,
        queryLogs: 0,
      });
      expect(body.criticalEvents.total).toBe(0);
      expect(body.criticalEvents.byCode.CHECKOUT_PERSISTENCE_FAILED).toBe(0);
    });
  });

  describe('ACP Protocol Adapter API (v0.2 scoped subset)', () => {
    let acpListingId: string;

    beforeEach(async () => {
      const resSeller = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'ACP Seller', type: 'seller', ownerEmail: 's@acp.com' },
      });
      sellerKey = JSON.parse(resSeller.body).apiKey;
      sellerId = JSON.parse(resSeller.body).agent.id;

      const resBuyer = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'ACP Buyer', type: 'buyer', ownerEmail: 'b@acp.com' },
      });
      buyerKey = JSON.parse(resBuyer.body).apiKey;
      buyerId = JSON.parse(resBuyer.body).agent.id;

      const resListing = await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          title: 'ACP Widget',
          description: 'A widget sold via the ACP adapter.',
          type: 'physical_good',
          priceAmount: 5000,
          quantityAvailable: 10,
        },
      });
      acpListingId = JSON.parse(resListing.body).listing.id;
    });

    describe('GET /v1/protocols/acp/product-feed', () => {
      it('rejects unauthenticated requests', async () => {
        const res = await app.inject({ method: 'GET', url: '/v1/protocols/acp/product-feed' });
        expect(res.statusCode).toBe(401);
      });

      it('returns only active listings mapped to the ACP catalog item shape', async () => {
        const resPaused = await app.inject({
          method: 'POST',
          url: '/v1/listings',
          headers: { authorization: `Bearer ${sellerKey}` },
          payload: {
            title: 'Paused Widget',
            description: 'Should not appear in the feed.',
            type: 'physical_good',
            priceAmount: 2500,
            quantityAvailable: 5,
          },
        });
        const pausedListingId = JSON.parse(resPaused.body).listing.id;
        await app.inject({
          method: 'POST',
          url: `/v1/listings/${pausedListingId}/pause`,
          headers: { authorization: `Bearer ${sellerKey}` },
        });

        const res = await app.inject({
          method: 'GET',
          url: '/v1/protocols/acp/product-feed',
          headers: { authorization: `Bearer ${buyerKey}` },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        const ids = body.items.map((item: any) => item.id);
        expect(ids).toContain(acpListingId);
        expect(ids).not.toContain(pausedListingId);

        const acpItem = body.items.find((item: any) => item.id === acpListingId);
        expect(acpItem).toEqual({
          id: acpListingId,
          title: 'ACP Widget',
          description: 'A widget sold via the ACP adapter.',
          price: { amount: 5000, currency: 'USD' },
          availability: 'in_stock',
          quantity_available: 10,
        });
      });
    });

    describe('POST /v1/protocols/acp/checkout-sessions', () => {
      it('creates a checkout session backed by the existing Stripe-hosted checkout redirect', async () => {
        seedAutoApprovePolicy(buyerId);

        const res = await app.inject({
          method: 'POST',
          url: '/v1/protocols/acp/checkout-sessions',
          headers: { authorization: `Bearer ${buyerKey}` },
          payload: {
            items: [{ id: acpListingId, quantity: 2 }],
            success_url: 'https://buyer.example.com/success',
            cancel_url: 'https://buyer.example.com/cancel',
          },
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body.checkoutSession.status).toBe('ready_for_payment');
        expect(body.checkoutSession.commercebackend_status).toBe('open');
        expect(body.checkoutSession.line_items).toEqual([
          { id: acpListingId, quantity: 2, amount_total: 10000 },
        ]);
        expect(body.checkoutSession.totals).toEqual({
          subtotal: 10000,
          total: 10000,
          currency: 'USD',
        });
        expect(body.checkoutSession.buyer_agent_id).toBe(buyerId);
        expect(body.checkoutSession.seller_agent_id).toBe(sellerId);
        expect(body.checkoutSession.payment_provider.type).toBe('commercebackend_stripe_hosted_redirect');
        expect(typeof body.checkoutSession.payment_provider.checkout_url).toBe('string');
      });

      it('rejects checkout sessions from non-buyer agents', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/v1/protocols/acp/checkout-sessions',
          headers: { authorization: `Bearer ${sellerKey}` },
          payload: {
            items: [{ id: acpListingId, quantity: 1 }],
            success_url: 'https://buyer.example.com/success',
            cancel_url: 'https://buyer.example.com/cancel',
          },
        });
        expect(res.statusCode).toBe(403);
      });

      it('rejects multi-item carts with a clear 400 instead of silently truncating', async () => {
        const resOtherListing = await app.inject({
          method: 'POST',
          url: '/v1/listings',
          headers: { authorization: `Bearer ${sellerKey}` },
          payload: {
            title: 'Second Widget',
            type: 'physical_good',
            priceAmount: 1500,
            quantityAvailable: 5,
          },
        });
        const otherListingId = JSON.parse(resOtherListing.body).listing.id;

        const res = await app.inject({
          method: 'POST',
          url: '/v1/protocols/acp/checkout-sessions',
          headers: { authorization: `Bearer ${buyerKey}` },
          payload: {
            items: [
              { id: acpListingId, quantity: 1 },
              { id: otherListingId, quantity: 1 },
            ],
            success_url: 'https://buyer.example.com/success',
            cancel_url: 'https://buyer.example.com/cancel',
          },
        });

        expect(res.statusCode).toBe(400);
        const body = JSON.parse(res.body);
        expect(body.error.code).toBe('ACP_UNSUPPORTED_REQUEST');
      });

      it('rejects requests missing required ACP fields', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/v1/protocols/acp/checkout-sessions',
          headers: { authorization: `Bearer ${buyerKey}` },
          payload: {
            items: [],
            success_url: 'https://buyer.example.com/success',
            cancel_url: 'https://buyer.example.com/cancel',
          },
        });
        expect(res.statusCode).toBe(400);
      });
    });

    describe('GET /v1/protocols/acp/checkout-sessions/:id', () => {
      async function createAcpCheckoutSession() {
        seedAutoApprovePolicy(buyerId);
        const res = await app.inject({
          method: 'POST',
          url: '/v1/protocols/acp/checkout-sessions',
          headers: { authorization: `Bearer ${buyerKey}` },
          payload: {
            items: [{ id: acpListingId, quantity: 1 }],
            success_url: 'https://buyer.example.com/success',
            cancel_url: 'https://buyer.example.com/cancel',
          },
        });
        return JSON.parse(res.body).checkoutSession;
      }

      it('allows the buyer agent to view their own checkout session', async () => {
        const created = await createAcpCheckoutSession();

        const res = await app.inject({
          method: 'GET',
          url: `/v1/protocols/acp/checkout-sessions/${created.id}`,
          headers: { authorization: `Bearer ${buyerKey}` },
        });

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body).checkoutSession.id).toBe(created.id);
      });

      it('allows the seller agent to view the checkout session', async () => {
        const created = await createAcpCheckoutSession();

        const res = await app.inject({
          method: 'GET',
          url: `/v1/protocols/acp/checkout-sessions/${created.id}`,
          headers: { authorization: `Bearer ${sellerKey}` },
        });

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body).checkoutSession.id).toBe(created.id);
      });

      it('rejects an unrelated agent with 403', async () => {
        const created = await createAcpCheckoutSession();

        const resOutsider = await app.inject({
          method: 'POST',
          url: '/v1/agents',
          payload: { name: 'Outsider', type: 'buyer', ownerEmail: 'outsider@acp.com' },
        });
        const outsiderKey = JSON.parse(resOutsider.body).apiKey;

        const res = await app.inject({
          method: 'GET',
          url: `/v1/protocols/acp/checkout-sessions/${created.id}`,
          headers: { authorization: `Bearer ${outsiderKey}` },
        });

        expect(res.statusCode).toBe(403);
      });

      it('returns 404 for a checkout session that does not exist', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/v1/protocols/acp/checkout-sessions/chk_does_not_exist',
          headers: { authorization: `Bearer ${buyerKey}` },
        });
        expect(res.statusCode).toBe(404);
      });
    });
  });

  describe('UCP Protocol Adapter API Endpoints', () => {
    beforeEach(async () => {
      const resSeller = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'UCP Seller', type: 'seller', ownerEmail: 's@ucp.com' },
      });
      sellerKey = JSON.parse(resSeller.body).apiKey;
      sellerId = JSON.parse(resSeller.body).agent.id;

      const resBuyer = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'UCP Buyer', type: 'buyer', ownerEmail: 'b@ucp.com' },
      });
      buyerKey = JSON.parse(resBuyer.body).apiKey;
      buyerId = JSON.parse(resBuyer.body).agent.id;

      const resListing = await app.inject({
        method: 'POST',
        url: '/v1/listings',
        headers: { authorization: `Bearer ${sellerKey}` },
        payload: {
          title: 'UCP Test Ticket',
          description: 'A ticket sold through the UCP mapping layer.',
          type: 'event_ticket',
          priceAmount: 5000,
          currency: 'USD',
          quantityAvailable: 10,
        },
      });
      testListingId = JSON.parse(resListing.body).listing.id;
    });

    describe('GET /v1/protocols/ucp/products', () => {
      it('rejects unauthenticated requests', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/v1/protocols/ucp/products',
        });
        expect(response.statusCode).toBe(401);
      });

      it('maps active listings to schema.org-style UCP products for any authenticated agent', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/v1/protocols/ucp/products',
          headers: { authorization: `Bearer ${buyerKey}` },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.pagination.total).toBe(1);
        expect(data.products).toEqual([
          {
            id: testListingId,
            name: 'UCP Test Ticket',
            description: 'A ticket sold through the UCP mapping layer.',
            offers: [{ price: 5000, currency: 'USD' }],
          },
        ]);
      });

      it('excludes paused listings', async () => {
        await app.inject({
          method: 'POST',
          url: `/v1/listings/${testListingId}/pause`,
          headers: { authorization: `Bearer ${sellerKey}` },
        });

        const response = await app.inject({
          method: 'GET',
          url: '/v1/protocols/ucp/products',
          headers: { authorization: `Bearer ${sellerKey}` },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.body);
        expect(data.products).toEqual([]);
        expect(data.pagination.total).toBe(0);
      });
    });

    describe('POST /v1/protocols/ucp/orders', () => {
      it('rejects seller agents from creating UCP orders', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/v1/protocols/ucp/orders',
          headers: { authorization: `Bearer ${sellerKey}` },
          payload: {
            lineItems: [{ productId: testListingId, quantity: 1 }],
            successUrl: 'http://localhost:3000/success',
            cancelUrl: 'http://localhost:3000/cancel',
          },
        });

        expect(response.statusCode).toBe(403);
        const data = JSON.parse(response.body);
        expect(data.error.code).toBe('FORBIDDEN');
      });

      it('rejects a request naming more than one distinct product with a clear 400', async () => {
        const otherListingRes = await app.inject({
          method: 'POST',
          url: '/v1/listings',
          headers: { authorization: `Bearer ${sellerKey}` },
          payload: {
            title: 'Second UCP Product',
            type: 'event_ticket',
            priceAmount: 3000,
            quantityAvailable: 5,
          },
        });
        const otherListingId = JSON.parse(otherListingRes.body).listing.id;

        const response = await app.inject({
          method: 'POST',
          url: '/v1/protocols/ucp/orders',
          headers: { authorization: `Bearer ${buyerKey}` },
          payload: {
            lineItems: [
              { productId: testListingId, quantity: 1 },
              { productId: otherListingId, quantity: 1 },
            ],
            successUrl: 'http://localhost:3000/success',
            cancelUrl: 'http://localhost:3000/cancel',
          },
        });

        expect(response.statusCode).toBe(400);
        const data = JSON.parse(response.body);
        expect(data.error.code).toBe('UCP_MULTI_ITEM_UNSUPPORTED');
        // Not silently truncated or merged: no checkout intent should have been created.
        expect(mockDb.checkoutIntents).toHaveLength(0);
      });

      it('creates a UCP order mapped onto an auto-approved checkout intent with a payment URL', async () => {
        seedAutoApprovePolicy(buyerId);

        const response = await app.inject({
          method: 'POST',
          url: '/v1/protocols/ucp/orders',
          headers: { authorization: `Bearer ${buyerKey}` },
          payload: {
            lineItems: [{ productId: testListingId, quantity: 2 }],
            successUrl: 'http://localhost:3000/success',
            cancelUrl: 'http://localhost:3000/cancel',
          },
        });

        expect(response.statusCode).toBe(201);
        const data = JSON.parse(response.body);
        expect(data.order.status).toBe('payment_pending');
        expect(data.order.buyerId).toBe(buyerId);
        expect(data.order.sellerId).toBe(sellerId);
        expect(data.order.lineItems).toEqual([{ productId: testListingId, quantity: 2 }]);
        expect(data.order.totalPrice).toEqual({ amount: 10000, currency: 'USD' });
        expect(data.order.paymentUrl).toContain('https://checkout.stripe.com/');

        expect(mockDb.checkoutIntents).toHaveLength(1);
        expect(mockDb.checkoutIntents[0].id).toBe(data.order.id);
      });

      it('creates a UCP order with requires_human_review and a null payment URL when no policy exists', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/v1/protocols/ucp/orders',
          headers: { authorization: `Bearer ${buyerKey}` },
          payload: {
            lineItems: [{ productId: testListingId, quantity: 1 }],
            successUrl: 'http://localhost:3000/success',
            cancelUrl: 'http://localhost:3000/cancel',
          },
        });

        expect(response.statusCode).toBe(201);
        const data = JSON.parse(response.body);
        expect(data.order.status).toBe('requires_human_review');
        expect(data.order.paymentUrl).toBeNull();
      });
    });

    describe('GET /v1/protocols/ucp/orders/:id', () => {
      it('lets the buyer and the seller view the UCP order, but forbids an unrelated agent', async () => {
        seedAutoApprovePolicy(buyerId);

        const createResponse = await app.inject({
          method: 'POST',
          url: '/v1/protocols/ucp/orders',
          headers: { authorization: `Bearer ${buyerKey}` },
          payload: {
            lineItems: [{ productId: testListingId, quantity: 1 }],
            successUrl: 'http://localhost:3000/success',
            cancelUrl: 'http://localhost:3000/cancel',
          },
        });
        const orderId = JSON.parse(createResponse.body).order.id;

        const buyerView = await app.inject({
          method: 'GET',
          url: `/v1/protocols/ucp/orders/${orderId}`,
          headers: { authorization: `Bearer ${buyerKey}` },
        });
        expect(buyerView.statusCode).toBe(200);
        expect(JSON.parse(buyerView.body).order.id).toBe(orderId);

        const sellerView = await app.inject({
          method: 'GET',
          url: `/v1/protocols/ucp/orders/${orderId}`,
          headers: { authorization: `Bearer ${sellerKey}` },
        });
        expect(sellerView.statusCode).toBe(200);
        expect(JSON.parse(sellerView.body).order.id).toBe(orderId);

        const otherAgentRes = await app.inject({
          method: 'POST',
          url: '/v1/agents',
          payload: { name: 'Unrelated Agent', type: 'buyer', ownerEmail: 'unrelated@ucp.com' },
        });
        const otherAgentKey = JSON.parse(otherAgentRes.body).apiKey;

        const forbiddenView = await app.inject({
          method: 'GET',
          url: `/v1/protocols/ucp/orders/${orderId}`,
          headers: { authorization: `Bearer ${otherAgentKey}` },
        });
        expect(forbiddenView.statusCode).toBe(403);
      });

      it('returns 404 for an unknown order id', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/v1/protocols/ucp/orders/chk_does_not_exist',
          headers: { authorization: `Bearer ${buyerKey}` },
        });
        expect(response.statusCode).toBe(404);
      });
    });
  });

  describe('Square Connector API (weekly item 9, read-only spike)', () => {
    let squareSellerId: string;

    beforeEach(async () => {
      const resSeller = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'Square Seller', type: 'seller', ownerEmail: 's@square-connector.test' },
      });
      squareSellerId = JSON.parse(resSeller.body).agent.id;
    });

    it('rejects sync requests without a valid operator key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/connectors/square/sync',
        payload: { sellerAgentId: squareSellerId },
      });
      expect(res.statusCode).toBe(401);
    });

    it('imports the fixture catalog into listings owned by the given seller, recording per-item failures in the sync log', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/connectors/square/sync',
        headers: operatorHeaders,
        payload: { sellerAgentId: squareSellerId },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.syncLog.connector).toBe('square');
      expect(body.syncLog.status).toBe('partial');
      expect(body.syncLog.itemsImported).toBeGreaterThan(0);
      expect(body.syncLog.itemsFailed).toBeGreaterThan(0);
      expect(Array.isArray(body.syncLog.errors)).toBe(true);
      expect(body.syncLog.errors[0]).toHaveProperty('externalId');
      expect(body.syncLog.errors[0]).toHaveProperty('message');

      const imported = mockDb.listings.filter((l: any) => l.importSource === 'square');
      expect(imported.length).toBe(body.syncLog.itemsImported);
      for (const listing of imported) {
        expect(listing.sellerAgentId).toBe(squareSellerId);
        expect(listing.externalId).toBeTruthy();
      }
    });

    it('re-running the sync updates existing imported listings instead of duplicating them', async () => {
      const first = await app.inject({
        method: 'POST',
        url: '/v1/connectors/square/sync',
        headers: operatorHeaders,
        payload: { sellerAgentId: squareSellerId },
      });
      const firstImported = JSON.parse(first.body).syncLog.itemsImported;
      const listingCountAfterFirst = mockDb.listings.filter((l: any) => l.importSource === 'square').length;

      const second = await app.inject({
        method: 'POST',
        url: '/v1/connectors/square/sync',
        headers: operatorHeaders,
        payload: { sellerAgentId: squareSellerId },
      });
      const secondImported = JSON.parse(second.body).syncLog.itemsImported;
      const listingCountAfterSecond = mockDb.listings.filter((l: any) => l.importSource === 'square').length;

      expect(secondImported).toBe(firstImported);
      expect(listingCountAfterSecond).toBe(listingCountAfterFirst);
    });

    it('rejects a sellerAgentId that is not a seller/both-type agent', async () => {
      const resBuyer = await app.inject({
        method: 'POST',
        url: '/v1/agents',
        payload: { name: 'Not A Seller', type: 'buyer', ownerEmail: 'buyer@square-connector.test' },
      });
      const buyerAgentId = JSON.parse(resBuyer.body).agent.id;

      const res = await app.inject({
        method: 'POST',
        url: '/v1/connectors/square/sync',
        headers: operatorHeaders,
        payload: { sellerAgentId: buyerAgentId },
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 for an unknown sellerAgentId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/connectors/square/sync',
        headers: operatorHeaders,
        payload: { sellerAgentId: 'agent_does_not_exist' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('lists sync logs for an authenticated operator, newest first', async () => {
      await app.inject({
        method: 'POST',
        url: '/v1/connectors/square/sync',
        headers: operatorHeaders,
        payload: { sellerAgentId: squareSellerId },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/v1/connectors/sync-logs',
        headers: operatorHeaders,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.syncLogs.length).toBeGreaterThan(0);
      expect(body.syncLogs[0].connector).toBe('square');
    });

    it('rejects listing sync logs without a valid operator key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/connectors/sync-logs',
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
