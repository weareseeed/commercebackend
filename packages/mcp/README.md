# @commercebackend/mcp

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that exposes CommerceBackend's search, listing, offer, checkout-intent, and order primitives as MCP tools, so MCP-aware AI agents can operate CommerceBackend without hand-written REST calls.

CommerceBackend is owned and maintained by Seeed LLC. Seeed LLC is unrelated to Seeed Studio.

This package implements the contract in [`docs/api/mcp-tool-spec.md`](../../docs/api/mcp-tool-spec.md). It is a thin adapter over the native HTTP API — it does not add capabilities the API doesn't already have, and it preserves CommerceBackend's v0.2 limits (no refunds, disputes, tax, Stripe Connect payouts, or merchant connectors).

## Tools

| Tool                                          | Native API                              |
| ---------------------------------------------- | ---------------------------------------- |
| `commercebackend_search_listings`              | `POST /v1/search`                        |
| `commercebackend_get_listing`                  | `GET /v1/listings/:id`                   |
| `commercebackend_create_listing`               | `POST /v1/listings`                      |
| `commercebackend_update_listing`               | `PATCH /v1/listings/:id`                 |
| `commercebackend_create_offer`                 | `POST /v1/listings/:id/offers`           |
| `commercebackend_accept_offer`                 | `POST /v1/offers/:id/accept`             |
| `commercebackend_create_checkout_intent`       | `POST /v1/checkout-intents`              |
| `commercebackend_get_order`                    | `GET /v1/orders/:id`                     |
| `commercebackend_update_fulfillment_status`    | `POST /v1/orders/:id/fulfillment`        |

Read-only doc resources are also exposed (`commercebackend://docs/...`, `commercebackend://agent-skill-kit/...`); see the tool spec for the full list.

## Configuration

| Variable                           | Required | Description                                                                     |
| ----------------------------------- | -------- | -------------------------------------------------------------------------------- |
| `COMMERCEBACKEND_API_URL`           | yes      | Base API URL, for example `http://localhost:4000`.                              |
| `COMMERCEBACKEND_API_KEY`           | yes      | Bearer key for an existing CommerceBackend agent. Never logged or echoed back.   |
| `COMMERCEBACKEND_DEFAULT_CURRENCY`  | no       | Default ISO currency code for examples; default `usd`.                          |
| `COMMERCEBACKEND_DRY_RUN`           | no       | When `true`, every mutating tool describes the intended request and stops there. |

## Run locally

```bash
pnpm --filter @commercebackend/mcp build
COMMERCEBACKEND_API_URL=http://localhost:4000 \
COMMERCEBACKEND_API_KEY=sk_your_agent_key \
node packages/mcp/dist/server.js
```

## Claude Desktop / Claude Code config

```json
{
  "mcpServers": {
    "commercebackend": {
      "command": "node",
      "args": ["/absolute/path/to/commercebackend/packages/mcp/dist/server.js"],
      "env": {
        "COMMERCEBACKEND_API_URL": "http://localhost:4000",
        "COMMERCEBACKEND_API_KEY": "sk_your_agent_key"
      }
    }
  }
}
```

## Cursor config (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "commercebackend": {
      "command": "node",
      "args": ["/absolute/path/to/commercebackend/packages/mcp/dist/server.js"],
      "env": {
        "COMMERCEBACKEND_API_URL": "http://localhost:4000",
        "COMMERCEBACKEND_API_KEY": "sk_your_agent_key",
        "COMMERCEBACKEND_DRY_RUN": "true"
      }
    }
  }
}
```

Start with `COMMERCEBACKEND_DRY_RUN=true` while testing a new agent so mutating tools only describe the request they would have sent.

## Safety boundaries

- Tool arguments are validated with Zod (reusing `@commercebackend/schemas` where the native API already defines a schema) before any HTTP call is made.
- The MCP layer never bypasses CommerceBackend API authorization; it only forwards the caller's bearer key.
- `commercebackend_create_checkout_intent` reports the checkout intent's status and whether a hosted Stripe Checkout URL was returned — it never reports a payment as completed, since that requires Stripe webhook reconciliation on the API side.
- The API key is never included in logs, errors, or tool output.
- This server does not implement refunds, disputes, payouts, tax calculation, or merchant connectors, and it has no operator risk-category enforcement beyond what the native API already does.

## Tests

```bash
pnpm --filter @commercebackend/mcp test
```

Tests cover the HTTP client, each tool's request mapping and dry-run behavior, and a full MCP protocol round-trip (a real `Client` against this server over an in-memory transport) with the CommerceBackend API mocked at the `fetch` boundary.
