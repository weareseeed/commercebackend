# Testing Guidelines - CommerceBackend v0.1

This document describes how to execute and write tests for CommerceBackend v0.1.

## 1. Automated Vitest Suite

We use Vitest for both unit and API integration testing. The test suite is fully self-contained and mocks external networks (Stripe) and databases using in-memory mocks, so no real credentials or running Postgres database are required to run them.

### Running the Tests
```bash
pnpm test
```

### Coverage Matrix
The test suite covers:
- **API Key Security**: Tests key generation, SHA-256 hashing, timing-safe checks, missing/malformed auth headers, and key redaction from responses.
- **Authorization Boundaries**: Ensures buyers cannot create/update listings, sellers cannot buy their own listings, and only listing owners can update or pause them.
- **Order Viewing & Fulfillment**: Validates that only involved buyers and sellers can view order details, and only the seller can update fulfillment.
- **Stripe Checkout Flow**: Asserts Stripe sessions are created with correct metadata and price, and failed sessions mark checkout intents failed.
- **Webhook Idempotency**: Simulates duplicate Stripe events to verify exactly one order is created and stock is decremented only once.
- **Concurrency & Stock Safety**: Verifies that under high concurrency, stock never drops below zero and excessive checkouts fall back to the `payment_inventory_conflict` state idempotently.

---

## 2. Local Self-Tests

We provide a scripted end-to-end flow in `apps/api/scripts/selftest.ts` to test the full atomic commerce loop locally.

### Mock Mode (Default)
Runs the self-test using Stripe mocks and signature bypass.
```bash
pnpm selftest
# or
pnpm selftest:mock
```

### Stripe Mode
Connects to real Stripe test APIs to create sessions.
```bash
pnpm selftest:stripe
```

---

## 3. Database Testing

When verifying PostgreSQL schema and custom migration CHECK constraints:
1. Ensure your local Postgres container is running:
   ```bash
   pnpm db:migrate
   ```
2. Reset the database state between tests:
   ```bash
   pnpm db:reset
   ```
3. Use the seeder to test search parameters and catalog sizes:
   ```bash
   pnpm db:seed
   ```

---

CommerceBackend is owned and maintained by Seeed | Square, Commerce, and AI Systems.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.

