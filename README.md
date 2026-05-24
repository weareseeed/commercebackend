# CommerceBackend v0.1

CommerceBackend is an open-source, agent-first commerce backend. It allows AI agents to list, discover, buy, and sell products through APIs, with Stripe Checkout facilitating payments.

Think "eBay or Amazon for agents," rather than a human-first storefront layout.

## Supported in v0.1 (Atomic Agent-Commerce Loop)

- **Agent Identity**: Registration and bearer API key credentials (raw keys returned once, only SHA-256 hashes stored, hashes are unique).
- **Fixed-price Listings**: Listing CRUD, pausing, activating, and inventory tracking.
- **Listing Search**: Score-based search matching terms across title, description, and JSON attributes. Logs queries to `AgentQueryLog`. Supports pagination.
- **Checkout Intents**: Initiating Stripe-backed hosted payment sessions (persisted first, using Stripe idempotency keys, fails gracefully on API error).
- **Stripe Checkout Webhook**: Webhook processing (`checkout.session.completed`) using transaction row-level locking, signature checking, duplicate idempotency, and inventory checks.
- **Fulfillment**: Seller agents can retrieve orders and update fulfillment status, and buyer agents can track status.
- **ACP & UCP protocol stubs**: Initial mapping logic for Agentic Commerce Protocol (ACP) and Universal Commerce Protocol (UCP).

## Explicitly NOT Supported in v0.1

- Human storefront layouts or marketplace search browsing UIs.
- Auctions, offers, counteroffers, or buyer/seller price negotiations.
- Multi-seller shopping carts.
- Refunds, disputes, platform fees, or tax calculation.
- Stripe Connect seller payouts.
- Merchant system connectors (Shopify, WooCommerce, Square, etc.).

---

## Architectural Diagram

```
Seller Agent                Buyer Agent
    │                            │
    │ POST /v1/listings          │ POST /v1/search
    ▼                            ▼
┌──────────────────────────────────────────────────┐
│              CommerceBackend API                 │
│                                                  │
│   ┌───────────────┐        ┌─────────────────┐   │
│   │ Agent Auth    │        │ Search Service  │   │
│   └───────────────┘        └─────────────────┘   │
│                                                  │
│   ┌───────────────┐        ┌─────────────────┐   │
│   │ Checkout      │        │ Orders & Fulfill│   │
│   └───────┬───────┘        └────────▲────────┘   │
└───────────┼─────────────────────────┼────────────┘
            │                         │
            │ Creates Session         │ Webhook Event
            ▼                         │ (checkout.session.completed)
┌──────────────────────┐    ┌─────────┴────────────┐
│   Stripe Checkout    ├───►│    Stripe Webhook    │
│ (Hosted Credit Card) │    └──────────────────────┘
└──────────────────────┘
```

---

## Standard Developer Commands

We maintain standard commands in the root workspace to manage compilation, quality checks, migrations, seeding, and execution:

### 1. Installation & Environment Configuration
```bash
pnpm install
cp .env.example .env
```

### 2. Database Migrations & Seeds
```bash
# Run Postgres database migrations
pnpm db:migrate

# Reset database (wipes tables)
pnpm db:reset

# Seed database with sample buyer, seller, and listings
pnpm db:seed
```

### 3. Local Development API Server
```bash
pnpm dev
```

### 4. Integration Tests
```bash
# Run unit and integration tests (with Stripe mocks)
pnpm test
```

### 5. Code Quality & Formatting
```bash
# Check code style with ESLint
pnpm lint

# Check type safety with TypeScript
pnpm typecheck
```

### 6. Compilation & Build
```bash
# Compile and build all monorepo workspaces
pnpm build
```

---

## Local Self-Tests

We provide a self-contained local self-test tool to verify the entire atomic commerce loop.

```bash
# Mode A: Mock Mode (does not connect to Stripe API, bypasses signatures)
pnpm selftest
# or
pnpm selftest:mock

# Mode B: Stripe Mode (connects to real Stripe test APIs, requires valid keys)
pnpm selftest:stripe
```

---

## API Summary

All endpoints conform to the standard error response layout and require request IDs.

| Method  | Endpoint                     | Auth   | Description                                            |
| ------- | ---------------------------- | ------ | ------------------------------------------------------ |
| `GET`   | `/health`                    | Public | Liveness status (version `0.1.0`)                      |
| `GET`   | `/ready`                     | Public | Readiness status (verifies database & Stripe config)    |
| `POST`  | `/v1/agents`                 | Public | Register a buyer/seller agent (returns API key once)   |
| `GET`   | `/v1/agents/me`              | Bearer | Get details of authenticated agent                     |
| `POST`  | `/v1/listings`               | Bearer | Create a fixed-price listing (Sellers only)            |
| `GET`   | `/v1/listings/:id`           | Bearer | Read listing details                                   |
| `PATCH` | `/v1/listings/:id`           | Bearer | Update listing properties (Owner only)                 |
| `POST`  | `/v1/listings/:id/pause`     | Bearer | Pause a listing (Owner only)                           |
| `POST`  | `/v1/listings/:id/activate`  | Bearer | Re-activate a listing (Owner only)                     |
| `POST`  | `/v1/search`                 | Bearer | Query catalog matching search terms and filters        |
| `POST`  | `/v1/checkout-intents`       | Bearer | Initiate checkout session for a listing (Buyers only)  |
| `POST`  | `/v1/webhooks/stripe`        | Public | Webhook verifying payment sessions and creating orders |
| `GET`   | `/v1/orders`                 | Bearer | Query list of orders for the agent (filtered by role)  |
| `GET`   | `/v1/orders/:id`             | Bearer | Read specific order details (Buyer or Seller only)     |
| `POST`  | `/v1/orders/:id/fulfillment` | Bearer | Update order fulfillment status (Seller only)          |

---

## Known v0.1 Limitations

- **No Stripe Connect**: Seller payouts must be processed manually outside the system.
- **No refunds or disputes**: Payments are one-way only; refunds are not supported via the API.
- **No tax calculation**: Tax collection is omitted in this version.
- **No auctions or price negotiation**: Only fixed-price catalogs are supported.
- **No multi-seller cart**: Orders are single-item only.
- **No merchant connectors**: No Shopify, BigCommerce, WooCommerce, or Square sync.
- **ACP/UCP Stubs**: Adapters are placeholder mapping templates and are not production-ready.
- **Inventory Model**: Decrements occur inside the webhook transaction, but does not support advance reservations; concurrent high-demand checkouts may trigger a `payment_inventory_conflict` state requiring manual review.
- **Fulfillment**: Fulfillment is status-only; no shipping labels, tracking APIs, or digital delivery automation.

---

## Further Documentation

Detailed documentation on development guides, security, testing, and payment setups:
- [Local Development Setup](file:///c:/Users/rsaer/OneDrive/Documents/Commerce%20backend/docs/local-dev.md)
- [Testing Guidelines](file:///c:/Users/rsaer/OneDrive/Documents/Commerce%20backend/docs/testing.md)
- [Security Auditing](file:///c:/Users/rsaer/OneDrive/Documents/Commerce%20backend/docs/security.md)
- [Stripe & Webhook Integration](file:///c:/Users/rsaer/OneDrive/Documents/Commerce%20backend/docs/stripe.md)
- [Native API Contract Specifications](file:///c:/Users/rsaer/OneDrive/Documents/Commerce%20backend/docs/api/native-api.md)
- [System Architecture](file:///c:/Users/rsaer/OneDrive/Documents/Commerce%20backend/docs/architecture/overview.md)

---

## License

MIT License. See LICENSE for details.
