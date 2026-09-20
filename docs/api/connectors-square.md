# Square Catalog Connector (read-only, fixture by default, optional live sandbox)

> **Scope note:** This is weekly backlog item 9, "Square connector spike
> (read-only)" — the canonical imported-catalog model and connector
> abstraction that item 8 ("Connector abstraction + Shopify import spike")
> was meant to provide, applied to Square first. Item 8 has since shipped its
> own Shopify import spike reusing the same shape — see
> `docs/api/connectors-shopify.md`. This is still a **read-only** connector —
> nothing is ever written back to Square. By default it reads a static
> fixture (`packages/connectors/square/src/fixtures/square-catalog-fixture.json`)
> standing in for a Square "List Catalog" response, with no live API call and
> no credentials needed. Configuring a real `SQUARE_ACCESS_TOKEN` switches it
> to fetch from an actual Square account instead — a **Square Developer
> Sandbox** account by default (`SQUARE_ENVIRONMENT=sandbox`), never
> production unless `SQUARE_ENVIRONMENT=production` is explicitly set. Either
> way, each catalog item is mapped to CommerceBackend's canonical catalog
> shape and written as ordinary `Listing` rows.

## What is supported

- Mapping a Square-shaped catalog object (`CatalogObject`, `type: "ITEM"`)
  to CommerceBackend's canonical catalog item shape
  (`packages/connectors/square/src/types.ts`, meant to be reused by future
  connectors such as Shopify — only Square implements it so far).
- Importing catalog items into real `Listing` rows, owned by an operator-
  specified seller agent, keyed on `(importSource, externalId)` so re-running
  the sync **updates** the same listings instead of duplicating them.
- A `CatalogSyncLog` row recording the outcome of every sync: how many items
  imported, how many failed, and why.
- Per-item failure isolation: one malformed catalog item (e.g. missing a
  price) is recorded in the sync log's `errors` array and skipped — it does
  not abort the rest of the batch.
- Imported listings are ordinary, unmodified `Listing` rows: they show up
  through the existing, unchanged `/v1/search` and `/v1/listings/:id`
  endpoints exactly like natively-created listings. No new agent-facing
  capability was added for buyer/seller agents.
- **Optional live Square Sandbox mode.** With a real `SQUARE_ACCESS_TOKEN`
  configured (see below), the sync fetches from Square's actual List Catalog
  API — sandbox by default — instead of the static fixture, following
  pagination cursors across the full catalog. Nothing else about the sync
  behavior changes: same endpoint, same operator gate, same upsert-by-
  `(importSource, externalId)` semantics.

## What is explicitly NOT supported

- **No OAuth / multi-merchant onboarding.** Live mode uses a single access
  token configured by the operator (your own Square account) — there is no
  "connect your Square store" flow for a third-party merchant yet.
- **No per-variation inventory sync in live mode.** Square's List Catalog API
  does not return inventory counts (that requires a separate Inventory API
  call this connector does not make yet), so live-fetched items default to
  `quantityAvailable: 0` unless a later iteration adds that call. The static
  fixture's `inventory_count` values are unaffected.
- **Single variation only.** Both the fixture and live mode map only
  `variations[0]` of each item; additional variations (sizes, colors, SKUs)
  are ignored.
- **One-way only.** Nothing is written back to Square, in fixture or live
  mode. "Read-only" refers to this: CommerceBackend never mutates the source
  catalog.
- **No scheduled/automatic sync.** An operator triggers a sync explicitly;
  there is no polling or webhook-driven re-sync.
- **No conflict resolution beyond last-write-wins.** Re-syncing an existing
  imported listing overwrites its title/description/price/quantity/type with
  the source's current values; there's no diffing or partial-field merge.
- **No BigCommerce/WooCommerce connectors yet.** Those are still separate,
  unstarted roadmap items. A Shopify import spike now exists reusing the same
  canonical shape, with its own optional live sandbox mode — see
  `docs/api/connectors-shopify.md`.

## Live Sandbox Mode

By default `SQUARE_ACCESS_TOKEN` is unset, so every sync reads the static
fixture — no setup, no credentials, no network call. To exercise the real
Square API instead:

1. Get a **sandbox** access token from the
   [Square Developer Dashboard](https://developer.squareup.com/apps) → your
   application → **Sandbox** → **Sandbox Access Token**. This is a test-mode
   token scoped to Square's sandbox environment; it cannot touch real money
   or a real merchant's data.
2. Set in your `.env` (see `.env.example`):
   ```
   SQUARE_ACCESS_TOKEN=your_square_sandbox_access_token
   SQUARE_ENVIRONMENT=sandbox
   ```
3. Run `POST /v1/connectors/square/sync` as usual, or use the end-to-end
   self-test: `pnpm selftest:square`.

An empty, unset, or obviously-placeholder value (containing `placeholder`,
`mock`, or `your_`) is always treated as "not configured" and falls back to
the fixture — the same convention `STRIPE_SECRET_KEY` uses (see
`packages/payments/stripe/src/client.ts`). Setting `SQUARE_ENVIRONMENT=production`
points live mode at Square's production API instead of sandbox; do this only
with a real production access token and only when you intend to read a real
merchant's live catalog.

---

## 1. Sync Square Catalog

- **POST** `/v1/connectors/square/sync`
- **Auth:** `X-Operator-Key` (operator-only — see `docs/security.md`). This is
  an operational action, not something a buyer/seller agent's bearer key can
  trigger.
- Body: `{ "sellerAgentId": "<id of an existing seller or both-type agent>" }`
  — imported listings are attributed to this agent as their owner.

**Body:**

```json
{ "sellerAgentId": "agent_seller_123" }
```

**Response (201 Created):**

```json
{
  "syncLog": {
    "id": "sync_abc123",
    "connector": "square",
    "sellerAgentId": "agent_seller_123",
    "status": "partial",
    "itemsImported": 3,
    "itemsFailed": 1,
    "errors": [
      { "externalId": "SQ_ITEM_MISSING_PRICE", "message": "Square item has no usable variation[0].item_variation_data.price_money." }
    ],
    "createdAt": "2026-09-12T00:00:00.000Z"
  }
}
```

`status` is `"success"` (no failures), `"partial"` (some items imported,
some failed), or `"failed"` (nothing imported — including when the catalog
source itself couldn't be reached at all, e.g. an invalid live sandbox token
or a network error; that case records a single entry in `errors` describing
the failure rather than any per-item mapping problem).

**Example curl:**

```bash
curl -X POST http://localhost:4000/v1/connectors/square/sync \
  -H "X-Operator-Key: your_operator_key" \
  -H "Content-Type: application/json" \
  -d '{"sellerAgentId": "agent_seller_123"}'
```

---

## 2. List Sync Logs

- **GET** `/v1/connectors/sync-logs?limit=20&offset=0`
- **Auth:** `X-Operator-Key`.
- Returns recent sync log entries across all connectors, newest first.

**Response (200 OK):**

```json
{
  "syncLogs": [ { "id": "sync_abc123", "connector": "square", "status": "partial", "itemsImported": 3, "itemsFailed": 1, "...": "..." } ],
  "pagination": { "limit": 20, "offset": 0 }
}
```

---

CommerceBackend is owned and maintained by Seeed LLC.

Seeed LLC is unrelated to Seeed Studio.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.
