# Architecture Overview - CommerceBackend v0.2

CommerceBackend is an open-source, agent-first commerce backend designed specifically for autonomous AI agents that need API-native listing discovery, offers, checkout, and fulfillment primitives.

## Primitives

The core architecture centers around six key domain entities:

1. **Agent**: The identity representing a buyer agent, seller agent, or both. Authentication is facilitated through bearer API keys hashed with `scrypt` and a per-record random salt for secure storage (see `docs/security.md`).
2. **Listing**: Represents a fixed-price product, service, ticket, or digital item sold by a seller agent.
3. **Offer**: Captures buyer-submitted proposed price and quantity terms, plus the seller accept/reject/counter workflow and immutable final negotiated terms once accepted.
4. **CheckoutIntent**: Tracks a buyer agent's explicit intent to purchase a listing or accepted offer and anchors Stripe Checkout session creation.
5. **Order**: Created asynchronously only after payment verification via Stripe webhooks.
6. **AgentQueryLog**: Logs search queries for catalog optimization and agent profiling.

## System Flow

```
Buyer Agent / Seller Agent
          ↓
  CommerceBackend Native API (Fastify)
          ↓
  PostgreSQL (System of Record)
          ↓
  Offer Negotiation / Checkout Intent
          ↓
  Stripe Checkout (Hosted Payment Page)
          ↓
  Stripe Webhook (checkout.session.completed)
          ↓
  Order Created & Inventory Decremented
          ↓
  Seller Agent Fulfillment
```

## Purchase policy and human approval

Before a Stripe Checkout session exists, a checkout intent is evaluated against the buyer agent's `PurchasePolicy` (`CheckoutService.evaluatePurchasePolicy`). A buyer with no enabled policy for the listing's currency always gets `human_approval_required`. Otherwise the intent is auto-approved only when the listing type and seller are allowed and the amount is within the policy's auto-approve and approval thresholds; offer checkouts can be forced to human approval. A `human_approval_required` intent has no Stripe session until an operator calls `POST /v1/checkout-intents/:id/approve` (operator key; buyer agents cannot approve), or it ends as `human_rejected`. A read-only `spendingLimitSignal` reports whether the checkout would exceed the policy's spending limit; it is **not yet enforced**. Transitions are visible through the operator checkout event ledger.

## Protocol adapters, MCP, and connectors

- **ACP** (`packages/protocols/acp`) and **UCP** (`packages/protocols/ucp`) are working, tested inbound/outbound adapters for a documented subset; see `docs/api/protocol-acp.md` and `docs/api/protocol-ucp.md`. UCP is CommerceBackend's own vendor-neutral mapping layer, not a claim of conformance to an external standard. The internal data model stays independent of both protocols.
- **MCP** (`packages/mcp`) exposes the native API as MCP tools; see `docs/api/mcp-tool-spec.md`.
- **Connectors** (`packages/connectors/{shopify,square,bigcommerce,woocommerce}`) provide read-only, operator-triggered catalog imports into the canonical imported-catalog model, with sync logs. They are fixture-driven by default; there is no automatic sync and no checkout through a third-party store.

---

CommerceBackend is owned and maintained by Seeed LLC.

Seeed LLC is unrelated to Seeed Studio.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.

