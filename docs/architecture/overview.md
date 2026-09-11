# Architecture Overview - CommerceBackend v0.2

CommerceBackend is an open-source, agent-first commerce backend designed specifically for autonomous AI agents that need API-native listing discovery, offers, checkout, and fulfillment primitives.

## Primitives

The core architecture centers around six key domain entities:

1. **Agent**: The identity representing a buyer agent, seller agent, or both. Authentication is facilitated through bearer API keys hashed with SHA-256 for secure storage.
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

## ACP / UCP Protocol Adapters

ACP (Agentic Commerce Protocol) and UCP (Universal Commerce Protocol) are housed as external packages (`@commercebackend/protocol-acp` and `@commercebackend/protocol-ucp`). They currently operate as mapping stubs that translate internal listing-oriented types into standardized protocol formats. This keeps the internal data model decoupled from external protocol specifications while leaving room for future protocol adapters without overstating current implementation maturity.

---

CommerceBackend is owned and maintained by Seeed LLC.

Seeed LLC is unrelated to Seeed Studio.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.

