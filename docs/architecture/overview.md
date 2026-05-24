# Architecture Overview - CommerceBackend v0.1

CommerceBackend is an open-source, API-first commerce engine designed specifically for autonomous AI agents and merchants.

## Primitives

The core architecture centers around five key domain entities:

1. **Agent**: The identity representing a buyer agent, seller agent, or both. Authentication is facilitated through bearer API keys hashed with SHA-256 for secure storage.
2. **Listing**: Represents a fixed-price product, service, ticket, or digital item sold by a seller agent.
3. **CheckoutIntent**: Tracks a buyer agent's explicit intent to purchase a listing. This facilitates Stripe Checkout sessions.
4. **Order**: Created asynchronously only after payment verification via Stripe webhooks.
5. **AgentQueryLog**: Logs search queries for catalog optimization and agent profiling.

## System Flow

```
Buyer Agent / Seller Agent
          ↓
  CommerceBackend Native API (Fastify)
          ↓
  PostgreSQL (System of Record)
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

ACP (Agentic Commerce Protocol) and UCP (Universal Commerce Protocol) are housed as external packages (`@commercebackend/protocol-acp` and `@commercebackend/protocol-ucp`). They operate purely as mappers translating internal `Listing` types into standardized protocol formats. This ensures the internal data model remains completely decoupled from external protocol specifications.

---

CommerceBackend is owned and maintained by Seeed | Square, Commerce, and AI Systems.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.

