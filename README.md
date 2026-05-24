# CommerceBackend v0.1

CommerceBackend is an open-source backend for agentic marketplaces. It lets AI agents list, discover, buy, and sell products using APIs, with Stripe Checkout facilitating payments.

Think “eBay/Amazon for agents,” rather than a human-first storefront layout.

## Supported in v0.1 (Atomic Agent-Commerce Loop)

- **Agent Identity**: Registration and bearer API key credentials (secured via SHA-256 hashes).
- **Fixed-price Listings**: Listing CRUD, pausing, activating, and inventory tracking.
- **Listing Search**: Score-based search matching terms across title, description, and JSON attributes. Logs queries to `AgentQueryLog`.
- **Checkout Intents**: Initiating stripe-backed purchase sessions.
- **Stripe Checkout Integration**: Webhook verification (`checkout.session.completed`) to securely transition state, generate orders, and decrement listing stock.
- **Order Fulfillment**: Seller agents can view pending orders and update fulfillment details.
- **ACP & UCP protocol stubs**: Initial mapping logic for Agentic Commerce Protocol (ACP) and Universal Commerce Protocol (UCP) decoupled from internal database models.

## Explicitly NOT Supported in v0.1

- Human storefront layouts or marketplace search browsing UIs.
- Auctions or buyer/seller price negotiations.
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

## Getting Started (Local Development Setup)

Follow these instructions to run the service locally. See [local-dev.md](file:///c:/Users/rsaer/OneDrive/Documents/Commerce%20backend/docs/local-dev.md) for more details.

### 1. Installation

Install monorepo dependencies:

```bash
pnpm install
```

### 2. Environment Configurations

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in the parameters:

- `DATABASE_URL`: Connection string to PostgreSQL (default: `postgresql://commercebackend:commercebackend@localhost:5432/commercebackend`)
- `STRIPE_SECRET_KEY`: Your Stripe secret test key (`sk_test_...`)
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook endpoint secret (`whsec_...`)

### 3. Database Setup & Migrations

1. Run Postgres container:
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```
2. Generate Prisma client:
   ```bash
   pnpm --filter @commercebackend/db exec prisma generate
   ```
3. Push schemas to database:
   ```bash
   pnpm --filter @commercebackend/db exec prisma db push
   ```

### 4. Database Seeding

Seed buyer agent, seller agent, and three listings (event ticket, digital good, physical good):

```bash
pnpm --filter @commercebackend/db seed
```

This prints the API keys for the buyer and seller.

### 5. Running the API Server

```bash
pnpm dev
```

The server starts locally at `http://localhost:4000`.

### 6. Running Tests

Run the Vitest integration suite:

```bash
pnpm test
```

---

## Stripe Webhook Setup

To test Stripe checkout flow locally:

1. Download and authenticate the [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Forward events to your local webhook route:
   ```bash
   stripe listen --forward-to localhost:4000/v1/webhooks/stripe
   ```
3. Copy the webhook secret (`whsec_...`) printed by the CLI and update `STRIPE_WEBHOOK_SECRET` in your `.env` file, then restart the server.

---

## Running Example Agents

Make sure the API server is running on `http://localhost:4000` before running these examples.

1. **Seller Agent**: Registers a seller and publishes a listing:
   ```bash
   pnpm --filter @commercebackend/example-seller-agent start
   ```
2. **Buyer Agent**: Registers a buyer, searches for Miami concert listings, and creates a Checkout Intent, printing a Stripe Checkout URL:
   ```bash
   pnpm --filter @commercebackend/example-buyer-agent start
   ```

---

## Native API Summary

| Method  | Endpoint                     | Auth   | Description                                            |
| ------- | ---------------------------- | ------ | ------------------------------------------------------ |
| `GET`   | `/health`                    | Public | Service healthcheck status                             |
| `POST`  | `/v1/agents`                 | Public | Create a buyer/seller agent (returns API key once)     |
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

## License

MIT License. See LICENSE placeholder for details.
