# BigCommerce Catalog Connector (read-only, fixture by default, optional live store)

> **Scope note:** This is weekly backlog item 13, "BigCommerce connector spike
> (read-only)." It reuses the canonical imported-catalog model and sync-log
> pattern that shipped with the Square (`docs/api/connectors-square.md`,
> weekly item 9) and Shopify (`docs/api/connectors-shopify.md`, weekly item 8)
> connector spikes, applied to a BigCommerce-shaped catalog. This is still a
> **read-only** connector — nothing is ever written back to BigCommerce. By
> default it reads a static fixture
> (`packages/connectors/bigcommerce/src/fixtures/bigcommerce-catalog-fixture.json`)
> standing in for a BigCommerce Catalog v3 `GET /catalog/products` response,
> with no live API call and no credentials needed. Configuring a real
> `BIGCOMMERCE_STORE_HASH` and `BIGCOMMERCE_ACCESS_TOKEN` switches it to fetch
> from an actual BigCommerce store instead — the operator's own store, never a
> third-party merchant's. Either way, each product is mapped to
> CommerceBackend's canonical catalog shape and written as ordinary `Listing`
> rows.

## What is supported

- Mapping a BigCommerce-shaped `Product` object to CommerceBackend's
  canonical catalog item shape
  (`packages/connectors/bigcommerce/src/types.ts`), the same shape the Square
  and Shopify connectors map into.
- Importing catalog products into real `Listing` rows, owned by an operator-
  specified seller agent, keyed on `(importSource, externalId)` so re-running
  the sync **updates** the same listings instead of duplicating them.
- A `CatalogSyncLog` row recording the outcome of every sync: how many items
  imported, how many failed, and why.
- Per-item failure isolation: one malformed product (e.g. missing a price) is
  recorded in the sync log's `errors` array and skipped — it does not abort
  the rest of the batch.
- Disabled BigCommerce products (`availability: "disabled"`) are skipped as
  not agent-shoppable, without being counted as sync failures. A `preorder`
  product is treated the same as an `available` one and is imported.
- Imported listings are ordinary, unmodified `Listing` rows: they show up
  through the existing, unchanged `/v1/search` and `/v1/listings/:id`
  endpoints exactly like natively-created listings. No new agent-facing
  capability was added for buyer/seller agents.
- **Optional live BigCommerce mode.** With a real `BIGCOMMERCE_STORE_HASH` and
  `BIGCOMMERCE_ACCESS_TOKEN` configured (see below), the sync fetches from
  BigCommerce's actual Catalog v3 `GET /catalog/products` endpoint instead of
  the static fixture, following `meta.pagination` page numbers across the
  full catalog. Nothing else about the sync behavior changes: same endpoint,
  same operator gate, same upsert-by-`(importSource, externalId)` semantics.

## What is explicitly NOT supported

- **No OAuth / multi-merchant onboarding.** Live mode uses a single store-
  level API account access token configured by the operator (your own
  BigCommerce store) — there is no "connect your BigCommerce store" flow for
  a third-party merchant yet.
- **One-way only.** Nothing is written back to BigCommerce, in fixture or
  live mode. "Read-only" in the roadmap item's name refers to this:
  CommerceBackend never mutates the source catalog.
- **No scheduled/automatic sync.** An operator triggers a sync explicitly;
  there is no polling or webhook-driven re-sync.
- **No conflict resolution beyond last-write-wins.** Re-syncing an existing
  imported listing overwrites its title/description/price/quantity/type with
  the source's current values; there's no diffing or partial-field merge.
- **No multi-currency support.** Both fixture and live mode treat product
  prices as USD; BigCommerce's per-store currency setting is not read.
- **Category names only resolve in fixture mode.** The fixture's `categories`
  field is a category *name* (e.g. `"Service"`), which the mapper uses to pick
  a finer-grained listing type (`service`, `event_ticket`) beyond BigCommerce's
  own `physical`/`digital` product type. BigCommerce's live Products endpoint
  returns category *ids*, not names, so live-fetched items always fall back to
  the `type`-based physical/digital default — resolving category names would
  require an additional Categories API call this spike does not make yet.
- **No inventory-location awareness in live mode.** Live mode reads each
  product's top-level `inventory_level` field as returned by the Products
  endpoint; it does not reconcile counts across multiple warehouses/locations.
- **No WooCommerce connector yet.** That is still a separate, unstarted
  roadmap item; only the canonical shape is meant to be shared with it.

## Live Mode

By default `BIGCOMMERCE_STORE_HASH` and `BIGCOMMERCE_ACCESS_TOKEN` are unset,
so every sync reads the static fixture — no setup, no credentials, no network
call. To exercise the real BigCommerce Catalog API instead:

1. In your own BigCommerce store's control panel, go to **Settings → API →
   Store-level API accounts**, create an account with `Products` read scope,
   and copy its **Access Token**. This is never a third-party merchant's
   store credentials.
2. Find your store's **store hash** — the segment of your control panel URL
   after `store/` (e.g. `abc123def` in
   `https://store-abc123def.mybigcommerce.com`).
3. Set in your `.env` (see `.env.example`):
   ```
   BIGCOMMERCE_STORE_HASH=abc123def
   BIGCOMMERCE_ACCESS_TOKEN=your_bigcommerce_access_token
   ```
4. Run `POST /v1/connectors/bigcommerce/sync` as usual, or use the end-to-end
   self-test: `pnpm selftest:bigcommerce`.

An empty, unset, or obviously-placeholder store hash or token (containing
`placeholder`, `your_`, or `store_hash`) is always treated as "not
configured" and falls back to the fixture — the same convention
`SHOPIFY_SHOP_DOMAIN`/`SHOPIFY_ACCESS_TOKEN` and `SQUARE_ACCESS_TOKEN` use
(see `packages/connectors/shopify/src/live-client.ts` and
`packages/connectors/square/src/live-client.ts`).

---

## 1. Sync BigCommerce Catalog

- **POST** `/v1/connectors/bigcommerce/sync`
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
    "id": "sync_ghi789",
    "connector": "bigcommerce",
    "sellerAgentId": "agent_seller_123",
    "status": "partial",
    "itemsImported": 3,
    "itemsFailed": 1,
    "errors": [
      { "externalId": "5004", "message": "BigCommerce product has no usable price." }
    ],
    "createdAt": "2026-09-25T00:00:00.000Z"
  }
}
```

`status` is `"success"` (no failures), `"partial"` (some items imported,
some failed), or `"failed"` (nothing imported — including when the catalog
source itself couldn't be reached at all, e.g. an invalid live access token
or a network error; that case records a single entry in `errors` describing
the failure rather than any per-item mapping problem).

**Example curl:**

```bash
curl -X POST http://localhost:4000/v1/connectors/bigcommerce/sync \
  -H "X-Operator-Key: your_operator_key" \
  -H "Content-Type: application/json" \
  -d '{"sellerAgentId": "agent_seller_123"}'
```

---

## 2. List Sync Logs

Sync logs across all connectors (Square, Shopify, and BigCommerce) share one
endpoint:

- **GET** `/v1/connectors/sync-logs?limit=20&offset=0`
- **Auth:** `X-Operator-Key`.
- Returns recent sync log entries across all connectors, newest first. See
  `docs/api/connectors-square.md` for the response shape.

---

CommerceBackend is owned and maintained by Seeed LLC.

Seeed LLC is unrelated to Seeed Studio.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.
