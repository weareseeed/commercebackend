# Testing Guidelines

This document describes the current verification workflow for CommerceBackend v0.2.

## Core verification commands

For code changes, run the standard workspace checks:

```bash
pnpm lint
pnpm typecheck
pnpm build
NODE_ENV=test pnpm test
```

Use `NODE_ENV=test pnpm test` so the suite runs with the expected mocked test configuration and does not depend on production-style Stripe validation.

On a clean clone, `pnpm typecheck` and `pnpm test` auto-build missing workspace package outputs before they run. That build also generates the Prisma client.

## Automated Vitest suite

CommerceBackend uses Vitest for unit and API-level integration coverage.

### Run the test suite

```bash
NODE_ENV=test pnpm test
```

### Coverage areas

The suite covers core agent-commerce behavior, including:

- API key generation, hashing, and bearer-auth enforcement
- Buyer/seller authorization boundaries
- Listing lifecycle and search behavior
- Offer submission, counteroffers, acceptance, rejection, cancellation, and expiration handling
- Checkout intent creation and idempotency protections
- Stripe webhook reconciliation and duplicate-event handling
- Order creation, visibility rules, and fulfillment status updates
- Inventory safety under concurrency and payment conflict paths

## Local self-tests

CommerceBackend also provides scripted end-to-end self-tests for the commerce loop.

### Mock mode

Runs without live Stripe network calls.

```bash
pnpm selftest
# or
pnpm selftest:mock
```

### Stripe mode

Uses Stripe test credentials and the real Stripe test API.

```bash
pnpm selftest:stripe
```

Do not use production credentials, and never commit or print secrets.

## Sandbox reset and smoke workflow

When validating the local sandbox runtime, use:

```bash
pnpm sandbox:reset
pnpm sandbox:smoke
```

This is useful after local schema, seed, or API behavior changes.

## Database-backed verification

When a change touches Prisma, migrations, seed data, or runtime flows that depend on PostgreSQL, run:

```bash
docker compose -f infra/docker-compose.yml up -d
pnpm db:migrate
pnpm db:seed
```

If you need a fresh local database state:

```bash
pnpm db:reset
pnpm db:seed
```

## Discovery verification

If a change touches agent-facing discovery assets, also run:

```bash
pnpm verify:discovery
```

If a change touches test tooling, scripts, or CI, also run:

```bash
pnpm verify:vitest-guard
```

This guard fails if a change introduces Vitest UI, Browser Mode, or network-exposed API server markers before the tracked Vitest 4 migration and human review are complete.

For production checks against `https://www.commercebackend.com`, run:

```bash
pnpm verify:discovery:public
pnpm verify:discovery:strict
```

`pnpm verify:discovery:strict` also checks the expected public content types for the canonical text and JSON endpoints, then reports the first differing text line or the JSON fields that drifted so maintainers can distinguish an incorrect header, stale repository artifact, or stale public deployment. If normalized content matches but raw bytes drift, it also prints a warning with byte counts, line-ending style, and likely deploy/CDN follow-up so operators can decide whether a literal-byte production follow-up is needed.

---

CommerceBackend is owned and maintained by Seeed LLC.

Copyright © 2026 Seeed LLC. Licensed under the Apache License 2.0.
