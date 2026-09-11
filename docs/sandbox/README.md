# CommerceBackend Sandbox Guide

This guide is the durable home for the hosted and local sandbox setup.

The sandbox is a separate CommerceBackend environment with:

- Prisma-managed PostgreSQL state
- deterministic demo fixtures
- Stripe test mode only
- public read endpoints under `/v1/public/*`
- operator-only reset and simulation controls

## What the sandbox is for

Use the sandbox to prove the agent-commerce loop without touching production data or real-money payments.

A sandbox user or agent should be able to:

1. read fixture metadata;
2. browse public listings without an API key;
3. create checkout intents with seeded buyer credentials;
4. observe purchase-policy behavior;
5. complete the payment flow in Stripe test mode or via operator simulation;
6. reset the environment back to a known state.

## Environment model

The sandbox has three separate concerns:

1. **Prisma + Postgres** for persistent state
2. **Stripe test mode** for checkout sessions and webhook verification
3. **Optional Google AI Studio client key** for any Gemini-based agent you point at the sandbox

CommerceBackend itself does **not** require Google AI Studio to boot. `GOOGLE_API_KEY` is only for the external agent client or demo app consuming the sandbox API.

## Required environment variables

Minimum API/runtime variables:

```bash
DATABASE_URL=postgresql://commercebackend:commercebackend@localhost:5432/commercebackend
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret
API_BASE_URL=http://localhost:4000
PORT=4000
OPERATOR_API_KEY=replace_with_a_long_random_value
SANDBOX_MODE=true
```

Optional external-agent variable:

```bash
GOOGLE_API_KEY=your_google_ai_studio_key
```

Rules:

- `SANDBOX_MODE=true` must use Stripe **test** keys, never `sk_live_` keys.
- `OPERATOR_API_KEY` protects reset and simulation routes.
- `GOOGLE_API_KEY` should stay outside this repo's committed files.
- `BYPASS_STRIPE_SIGNATURE=true` is development-only and must not be used in production.

## Local setup with Prisma

Start from the repo root.

### 1. Create the sandbox env file

```bash
cp .env.sandbox.example .env
```

Edit `.env` and replace placeholders for:

- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPERATOR_API_KEY`

### 2. Start Postgres

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 3. Apply Prisma migrations

```bash
pnpm db:migrate
```

This runs Prisma migration deploy through the workspace DB package.

### 4. Seed deterministic sandbox fixtures

```bash
pnpm db:seed
```

The seed writes deterministic fixture IDs and fresh local agent credentials. Local generated credentials are also written to:

```text
.commercebackend-seed-credentials.json
```

### 5. Start the API

```bash
pnpm dev
```

### 6. Verify the sandbox

In a second shell:

```bash
pnpm sandbox:reset
pnpm sandbox:smoke
```

## Seeded fixture model

The sandbox reset/seed flow creates:

- 1 seller agent
- 2 buyer agents
- 5 listings
- 2 purchase policies
- 2 offer fixtures
- 1 approval-required checkout-intent fixture

Important deterministic IDs include:

- `sandbox_agent_seller_primary`
- `sandbox_agent_buyer_auto`
- `sandbox_agent_buyer_approval`
- `sandbox_listing_vip_jazz_ticket`
- `sandbox_listing_agentic_pdf_guide`
- `sandbox_listing_autonomous_devkit`
- `sandbox_listing_custom_workshop`
- `sandbox_listing_low_inventory_bundle`

## Public and operator routes

Public read routes:

- `GET /v1/public/listings`
- `GET /v1/public/listings/:id`
- `POST /v1/public/search`
- `GET /v1/sandbox/fixtures`

Operator routes:

- `POST /v1/sandbox/reset`
- `POST /v1/checkout-intents/:id/approve`
- `POST /v1/sandbox/checkout-intents/:id/simulate-complete`

Operator requests require:

```http
x-operator-key: <OPERATOR_API_KEY>
```

## Prisma deployment shape for a hosted sandbox

For a hosted sandbox environment:

1. provision a dedicated Postgres database;
2. set `DATABASE_URL` for the sandbox deployment only;
3. run `pnpm db:migrate` against that sandbox database;
4. deploy the API with `SANDBOX_MODE=true`;
5. run one operator reset after deploy to load the deterministic fixtures.

Do not share the production database with the sandbox.

## Using Google AI Studio clients against the sandbox

If you want a Gemini-powered buyer or seller agent to exercise the sandbox:

1. create an API key in Google AI Studio;
2. export it locally:

```bash
export GOOGLE_API_KEY=your_google_ai_studio_key
```

3. point your agent code at the sandbox base URL, for example:

```bash
export API_BASE_URL=http://localhost:4000
```

4. use sandbox buyer credentials from the reset response or local seed credential file.

Important boundary:

- CommerceBackend handles commerce state, policy, listings, checkout, and orders.
- Google AI Studio handles the LLM you use to decide what the agent should do next.
- The sandbox API does not depend on Gemini-specific SDK code in this repo.

## Smoke test expectations

`pnpm sandbox:smoke` validates:

- health and readiness
- public listing discovery
- public search
- auto-approved fixed-price checkout
- inventory decrement after simulated completion
- human-approval-required fixed-price checkout
- operator approval flow
- accepted-offer checkout using accepted terms

## Limitations

- Sandbox data is fictional and resettable.
- Stripe remains test mode only.
- Operator simulation is for demo verification, not a production payment substitute.
- Public write access should stay tightly rate-limited before any public launch.
- Google AI Studio usage is optional and external to the API runtime.

## Approval gate

Public DNS, public deployment, and public write access still require explicit approval before launch under `commercebackend.com`.
