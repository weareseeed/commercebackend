# Security Model - CommerceBackend v0.2

This document explains the security architecture, authorization boundaries, and key constraints implemented in CommerceBackend v0.2.

## 1. Agent API Key Security

- **Generation**: High-entropy API keys are generated using `crypto.randomBytes(24)` with environment-based prefixes (`cb_live_` or `cb_test_`).
- **One-time Return**: The raw key is returned exactly once during the agent registration response payload.
- **Hashed Storage**: Only the SHA-256 hash of the API key is stored in the database (`Agent.apiKeyHash`), which is configured with a `@unique` constraint.
- **Redaction**: The `apiKeyHash` field is stripped from all outgoing agent responses, including agent creation and `GET /v1/agents/me`.
- **Timing Attacks**: A timing-safe comparison helper `timingSafeCompare` is provided for comparing secrets to prevent side-channel attacks.
- **Log Hygiene**: Raw API keys and Authorization headers are automatically redacted from all application logs.

---

## 2. Authorization Model & Boundaries

We enforce strict validation rules across the API based on the authenticated agent's ID and type:

### Listings
- **Creation**: Only agents with type `seller` or `both` can create listings.
- **Updates**: Only the listing's owner (`sellerAgentId`) can edit title, description, quantity, price, or change status (active/paused).
- **Activation**: Cannot activate a listing that has `quantityAvailable = 0`.

### Checkout
- **Role Check**: Only agents with type `buyer` or `both` can initiate checkout.
- **Self-Purchase**: Agents cannot purchase their own listings.
- **Listing Status**: Checkout is blocked for paused, deleted, or sold-out listings.
- **Inventory Check**: Quantity requested must be positive (`> 0`) and cannot exceed the listing's `quantityAvailable`.

### Offers
- **Creation**: Only buyer or both-type agents can submit offers on listings they do not own.
- **Seller Actions**: Only the listing owner can accept, reject, or counter an offer.
- **Buyer Actions**: Only the buyer who created the offer can cancel it or accept a seller counteroffer.
- **State Guardrails**: Offer transitions are validated server-side so duplicate acceptance, stale counters, or reuse after checkout are rejected.

### Orders & Fulfillment
- **Details Visibility**: Only the buyer agent or the seller agent involved in an order can view details (`GET /v1/orders/:id`). Unrelated agents receive `403 Forbidden`.
- **Fulfillment Updates**: Only the seller agent of the order can change fulfillment status or add notes.

---

## 3. Stripe Webhook Verification

- **Signature Check**: All Stripe webhook requests verify the `stripe-signature` header using the configured webhook secret (`STRIPE_WEBHOOK_SECRET`) to prevent spoofing.
- **Bypass Flag**: In `test` or with `BYPASS_STRIPE_SIGNATURE=true` flag, signature checking is skipped to enable mock tests.
- **Raw Body Preservation**: Fastify is configured with a raw body plugin to pass untouched buffers to Stripe SDK, as modified payloads cause signature check failures.

---

## 4. Webhook Concurrency & Idempotency

- **Idempotency**: Webhook processing uses unique transaction scopes. If a duplicate webhook event is received for an already `paid` or `payment_inventory_conflict` intent, the system returns a `200 OK` without creating duplicate orders or double-decrementing stock.
- **Row-Level Locking**: Webhook queries use a Postgres row-level lock (`SELECT * FROM "Listing" WHERE id = $1 FOR UPDATE`) inside a transaction to prevent race conditions during concurrent payments.
- **Inventory Conflict**: If stock becomes unavailable between checkout intent creation and payment success, the checkout intent is marked as `payment_inventory_conflict` to isolate the state for manual review/refunds.

## 5. Offer Checkout Protection

- **Accepted Terms Freeze**: Once a seller accepts an offer or a buyer accepts a counteroffer, the negotiated price and quantity are frozen on the offer record.
- **Checkout Pending State**: Starting checkout for an accepted offer transitions it to `checkout_pending` to prevent the same negotiated terms from being reused concurrently.
- **Failure Reversion**: If Stripe session creation fails, the offer reverts from `checkout_pending` back to `accepted` so the buyer can retry without manual cleanup.
- **Completion Audit Trail**: Successful webhook reconciliation records offer checkout completion history alongside the resulting order.

---

## 6. Temporary Vitest Exposure Guard

- **Current posture**: The repository intentionally uses `vitest run` only. Vitest UI, Browser Mode, and network-exposed Vitest API server configurations are not part of the approved local or CI workflow.
- **Guard script**: `pnpm verify:vitest-guard` scans repo configuration and CI files for markers such as `--ui`, `--browser`, `--api.host`, `@vitest/ui`, `@vitest/browser`, `allowWrite`, and `allowExec`.
- **Why it exists**: Dependabot currently reports the open Vitest advisory tracked in the repository. Until the planned Vitest 4 migration lands and is human-reviewed, this guard reduces the risk of accidentally introducing the exposed UI/API surface into supported workflows.

## 7. Security alert triage workflow

- Use [`docs/maintenance/dependency-triage.md`](./maintenance/dependency-triage.md) when reviewing Dependabot PRs and GitHub security alerts.
- Classify alerts by exposed surface before escalating them as runtime compromise:
  - runtime or money-path exposure;
  - production asset exposure;
  - local-only dev tooling exposure;
  - CI-only or disabled workflow exposure.
- Current open Vite, esbuild, minimatch, and Vitest findings should be described with their actual exposure conditions, not as blanket proof of a production API breach.

---

CommerceBackend is owned and maintained by Seeed LLC.

Seeed LLC is unrelated to Seeed Studio.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.

