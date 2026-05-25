# CommerceBackend MCP Tool Spec

**Status:** implementation contract, not a shipped MCP server yet  
**Owner:** Seeed LLC  
**Maintainer:** Joshua / Seeed AI Operations

This document defines the first Model Context Protocol (MCP) tool surface for CommerceBackend. It exists so coding agents can implement a small MCP server without inventing tool names, auth behavior, or safety boundaries.

CommerceBackend is owned and maintained by Seeed LLC. Seeed LLC is unrelated to Seeed Studio.

---

## Goals

- Let MCP-aware AI agents operate CommerceBackend through stable tools instead of hand-written REST calls.
- Keep the MCP server as a thin adapter over the existing HTTP API.
- Preserve CommerceBackend's v0.2 limits and Stripe-sensitive safety boundaries.
- Make tool behavior explicit enough for coding agents to implement and test.

## Non-goals for the first MCP server

- No autonomous public posting or external promotion.
- No Stripe Connect payouts, refunds, disputes, tax calculation, shipping labels, or merchant connectors.
- No hidden policy override tool.
- No storage of raw API keys outside the user's MCP client configuration.

---

## Runtime configuration

Recommended package name:

```text
@commercebackend/mcp
```

Required environment variables:

| Variable                  | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `COMMERCEBACKEND_API_URL` | Base API URL, for example `http://localhost:4000`. |
| `COMMERCEBACKEND_API_KEY` | Bearer key for an existing CommerceBackend agent.  |

Optional environment variables:

| Variable                           | Description                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| `COMMERCEBACKEND_DEFAULT_CURRENCY` | Default ISO currency code for examples; default `usd`.                                  |
| `COMMERCEBACKEND_DRY_RUN`          | When `true`, validate inputs and describe intended calls without changing server state. |

Authentication rule: every tool that calls protected CommerceBackend endpoints must send:

```text
Authorization: Bearer $COMMERCEBACKEND_API_KEY
```

Never log raw API keys.

---

## Tool set

### `commercebackend_search_listings`

Search active listings.

Maps to:

```text
POST /v1/search
```

Input schema:

```json
{
  "type": "object",
  "required": ["query"],
  "properties": {
    "query": { "type": "string" },
    "limit": { "type": "integer", "minimum": 1, "maximum": 50 },
    "offset": { "type": "integer", "minimum": 0 }
  }
}
```

### `commercebackend_get_listing`

Fetch one listing by ID.

Maps to:

```text
GET /v1/listings/:id
```

Input schema:

```json
{
  "type": "object",
  "required": ["listing_id"],
  "properties": {
    "listing_id": { "type": "string" }
  }
}
```

### `commercebackend_create_listing`

Create a seller listing. Requires a seller or both-type agent API key.

Maps to:

```text
POST /v1/listings
```

Input schema should mirror `CreateListingSchema` from `@commercebackend/schemas`. The MCP implementation must import or copy that schema rather than accepting arbitrary JSON.

### `commercebackend_update_listing`

Update a listing owned by the authenticated seller agent.

Maps to:

```text
PATCH /v1/listings/:id
```

Input schema:

```json
{
  "type": "object",
  "required": ["listing_id", "patch"],
  "properties": {
    "listing_id": { "type": "string" },
    "patch": { "type": "object" }
  }
}
```

Validate `patch` against `UpdateListingSchema`.

### `commercebackend_create_offer`

Create a buyer offer for a listing.

Maps to:

```text
POST /v1/offers
```

Input schema should mirror the API's create-offer schema.

### `commercebackend_accept_offer`

Accept an offer as the seller agent.

Maps to:

```text
POST /v1/offers/:id/accept
```

Input schema:

```json
{
  "type": "object",
  "required": ["offer_id"],
  "properties": {
    "offer_id": { "type": "string" }
  }
}
```

### `commercebackend_create_checkout_intent`

Create a Stripe-backed checkout intent for a listing or accepted offer.

Maps to:

```text
POST /v1/checkout-intents
```

Input schema should mirror the API checkout-intent schema. The tool response must clearly state whether a hosted Stripe Checkout URL was created or whether the API returned a safe failure.

### `commercebackend_get_order`

Fetch an order by ID.

Maps to:

```text
GET /v1/orders/:id
```

Input schema:

```json
{
  "type": "object",
  "required": ["order_id"],
  "properties": {
    "order_id": { "type": "string" }
  }
}
```

### `commercebackend_update_fulfillment_status`

Update fulfillment status as the seller agent.

Maps to:

```text
PATCH /v1/orders/:id/fulfillment
```

Input schema should mirror the API fulfillment update schema.

---

## Safety boundaries

1. Treat tool arguments as untrusted input. Validate with schemas before making HTTP calls.
2. Do not bypass CommerceBackend API authorization rules in the MCP layer.
3. Do not create checkout intents for product categories that the operator has marked as risky or unsupported.
4. Do not claim a payment has completed until the CommerceBackend API has processed the Stripe webhook and returned an order state that supports that claim.
5. Do not expose raw API keys in errors, logs, prompts, or MCP responses.
6. If `COMMERCEBACKEND_DRY_RUN=true`, never call mutating endpoints.
7. Surface v0.2 limits when users ask for refunds, disputes, payouts, tax, shipping labels, human storefront UI, or merchant connectors.

---

## Suggested MCP resources

Expose read-only resources for docs-oriented clients:

| URI                                         | Backing source                             |
| ------------------------------------------- | ------------------------------------------ |
| `commercebackend://docs/overview`           | `docs/architecture/overview.md`            |
| `commercebackend://docs/api`                | `docs/api/native-api.md`                   |
| `commercebackend://agent-skill-kit/general` | `agent-skill-kit/commercebackend-skill.md` |
| `commercebackend://agent-skill-kit/buyer`   | `agent-skill-kit/buyer-agent.skill.md`     |
| `commercebackend://agent-skill-kit/seller`  | `agent-skill-kit/seller-agent.skill.md`    |
| `commercebackend://agent-skill-kit/coding`  | `agent-skill-kit/coding-agent.skill.md`    |

---

## Implementation checklist

- [ ] Create `packages/mcp` or `apps/mcp` package.
- [ ] Use the official MCP SDK unless there is a strong reason not to.
- [ ] Reuse schemas from `@commercebackend/schemas` where possible.
- [ ] Add dry-run tests for every mutating tool.
- [ ] Add integration tests against the local API in `NODE_ENV=test`.
- [ ] Add README install snippet for Claude Desktop / Cursor style MCP config.
- [ ] Update `llms.txt`, `llms-full.txt`, `.well-known/commercebackend.json`, README, and Agent Skill Kit only after the MCP server is real.
