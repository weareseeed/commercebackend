# CommerceBackend Roadmap

CommerceBackend is Seeed LLC's open-source, agent-first commerce backend. The project is built around a direct agent-native marketplace foundation first, then connector imports and hosted operations after the money path is boring and auditable.

This roadmap is intentionally conservative. If a feature affects payments, inventory, fulfillment, customer data, or public claims, it needs tests, logs, and documentation before it is treated as shipped.

## Current status

### Shipped foundation — v0.1 through v0.2.1

CommerceBackend currently provides the open-source foundation for agents to list, discover, negotiate, and purchase through APIs.

What exists now:

- Fastify API server.
- PostgreSQL/Prisma system of record.
- Agent, listing, offer, offer history, checkout intent, order, and query-log models.
- Seller-agent listing flow.
- Buyer-agent search/discovery flow.
- Fixed-price checkout flow through Stripe Checkout.
- Offer negotiation flow with accepted terms, expiration checks, and checkout reuse protection.
- Stripe webhook-backed order creation and inventory decrement.
- Production guardrails around Stripe webhook signature verification.
- Structured critical logging for checkout persistence failures.
- JavaScript SDK/package structure.
- Agent-readable discovery files:
  - `/llms.txt`
  - `/llms-full.txt`
  - `/.well-known/commercebackend.json`
- Public discovery asset verification script.
- Production container image (multi-stage Docker) and a host-agnostic deploy
  runbook for Cloud Run and Railway (`docs/deploy/`), with migrate/seed-on-boot.
- Operational hardening: per-IP rate limiting (health/webhook exempt),
  configurable CORS allowlist, and constant-time operator-key comparison.
- Apache-2.0 license.

Current release:

- `v0.2.1` — post-v0.2 hardening, discovery verification, and a containerized
  deploy path for the hosted sandbox.

## v0.3 — Connector imports, search correctness, and controlled checkout design

Goal: let external commerce catalogs enter CommerceBackend while keeping the native agent marketplace model as the internal source of truth, and design the policy/approval layer agents need before money moves.

Planned work:

- Purchase-policy design for buyer agents: spending limits, listing/seller constraints, and human-approval thresholds.
- Approval-state checkout-intent design for `human_approval_required`, `human_approved`, and `human_rejected` flows.
- Checkout event ledger design for policy evaluation, approval, Stripe session creation, webhook completion, order creation, and inventory state transitions.
- Connector abstraction for imported catalogs.
- Initial Shopify connector spike.
- Initial Square connector spike.
- BigCommerce connector research.
- Canonical imported catalog model for merchant/product/variant data.
- Mapping from imported catalog items into agent-facing listings.
- Redirect checkout support for imported merchant storefronts where CommerceBackend does not own checkout.
- DB-level search/indexing to replace temporary in-memory listing scans.
- Search ranking and filtering documentation.
- Connector sync logs and failure states.

Non-goals for v0.3:

- Full tax engine.
- Refund/dispute engine.
- Stripe Connect payouts.
- Multi-seller carts.
- Finished merchant dashboard.

## v0.4 — Hosted sandbox and operator visibility

Goal: make CommerceBackend feel live to outside builders without asking them to become infrastructure operators first.

Planned work:

- Public test-mode demo API.
- Seeded buyer and seller agents.
- Seeded demo listings.
- Stripe test-mode checkout path.
- Purchase-policy demo showing bounded auto-approval vs. human approval required.
- Checkout event ledger for policy evaluation, approval, Stripe handoff, webhook completion, order creation, and inventory changes.
- Webhook receiver and replay guidance.
- Demo database reset policy.
- Rate limiting and abuse controls.
- Hosted API health endpoint.
- Public sandbox docs.
- Basic operator dashboard for:
  - agents
  - listings
  - offers
  - checkout intents
  - orders
  - query logs
  - critical payment-path events

Non-goals for v0.4:

- Real-money public marketplace operation.
- Seller payouts.
- Unrestricted public write access.
- Production merchant connector onboarding.

## v0.5 — Protocol adapters and agent integrations

Goal: make CommerceBackend easier for agents and agent frameworks to consume without duplicating behavior across tools.

Planned work:

- Fuller ACP adapter implementation.
- Fuller UCP adapter implementation.
- MCP server or adapter spike.
- Agent skill kit refinements.
- Claude/Copilot/Cursor/Windsurf adapter maintenance.
- Runnable buyer-agent and seller-agent examples against the sandbox.
- Permission model examples for safe commerce actions.
- Agent evaluation fixtures for discovery, checkout approval, and failure handling.

## v0.6+ — Commercial infrastructure layer

Goal: turn the OSS foundation into a practical Seeed-operated platform without over-promising payment/compliance features.

Candidate work:

- CommerceBackend Cloud planning.
- Merchant dashboard.
- Connector hosting.
- Operational alerting and audit trails.
- Stripe Connect feasibility and compliance review.
- WTZON/event-ticketing vertical proof.
- Rogue Commerce human marketplace layer.
- Support workflow and SLA definition.

## Explicit limitations today

CommerceBackend v0.2.1 does not include:

- Refunds.
- Disputes.
- Tax calculation.
- Stripe Connect payouts.
- Shipping labels.
- Merchant connector imports.
- Auctions.
- Multi-seller carts.
- A production public marketplace with unrestricted real-money seller onboarding.

Those are not hidden features. They are roadmap items or deliberate non-goals until the supporting compliance, payment, and operational controls exist.

## Product principles

1. Agents are first-class users, not wrappers around human storefronts.
2. Payment paths must be boring, logged, and auditable.
3. Stripe terms and conditions define hard product boundaries.
4. ACP/UCP are adapters, not the internal data model.
5. Connector imports should feed the canonical model, not replace it.
6. Public claims must match shipped behavior.
7. Seeed LLC owns and maintains CommerceBackend; it is unrelated to Seeed Studio.
