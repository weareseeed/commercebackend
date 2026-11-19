# WooCommerce Catalog Connector (read-only, fixture by default, optional live store)

> **Scope note:** This is weekly backlog item 15, "WooCommerce connector spike
> (read-only)." It reuses the canonical imported-catalog model and sync-log
> pattern that shipped with the Square (`docs/api/connectors-square.md`,
> weekly item 9), Shopify (`docs/api/connectors-shopify.md`, weekly item 8),
> and BigCommerce (`docs/api/connectors-bigcommerce.md`, weekly item 13)
> connector spikes, applied to a WooCommerce-shaped catalog. This is still a
> **read-only** connector — nothing is ever written back to WooCommerce. By
> default it reads a static fixture
> (`packages/connectors/woocommerce/src/fixtures/woocommerce-catalog-fixture.json`)
> standing in for a WooCommerce REST API `GET /wp-json/wc/v3/products`
> response, with no live API call and no credentials needed. Configuring a
> real `WOOCOMMERCE_SITE_URL`, `WOOCOMMERCE_CONSUMER_KEY`, and
> `WOOCOMMERCE_CONSUMER_SECRET` switches it to fetch from an actual
> WooCommerce store instead — the operator's own store, never a third-party
> merchant's. Either way, each product is mapped to CommerceBackend's
> canonical catalog shape and written as ordinary `Listing` rows.

## What is supported

- Mapping a WooCommerce-shaped `Product` object to CommerceBackend's
  canonical catalog item shape
  (`packages/connectors/woocommerce/src/types.ts`), the same shape the
  Square, Shopify, and BigCommerce connectors map into.
- Importing catalog products into real `Listing` rows, owned by an operator-
  specified seller agent, keyed on `(importSource, externalId)` so re-running
  the sync **updates** the same listings instead of duplicating them.
- A `CatalogSyncLog` row recording the outcome of every sync: how many items
  imported, how many failed, and why.
- Per-item failure isolation: one malformed product (e.g. missing a price) is
  recorded in the sync log's `errors` array and skipped — it does not abort
  the rest of the batch.
- Non-`publish` WooCommerce products (`draft`, `pending`, `private`) are
  skipped as not agent-shoppable, without being counted as sync failures. An
  `onbackorder` product is treated the same as an `instock` one and is
  imported.
- Imported listings are ordinary, unmodified `Listing` rows: they show up
  through the existing, unchanged `/v1/search` and `/v1/listings/:id`
  endpoints exactly like natively-created listings. No new agent-facing
  capability was added for buyer/seller agents.
- **Category names resolve the same way in fixture and live mode.** Unlike
  the BigCommerce connector (whose live Products endpoint returns category
  *ids* only — see the "known limitation" note in
  `docs/api/connectors-bigcommerce.md`), WooCommerce's `categories` field
  always includes the category `name` directly, in both the static fixture
  and the real REST API. The mapper uses this name to pick a finer-grained
  listing type (`service`, `event_ticket`) beyond WooCommerce's own
  `virtual`/physical signal, with no live-mode fallback limitation.
- **Optional live WooCommerce mode.** With a real `WOOCOMMERCE_SITE_URL`,
  `WOOCOMMERCE_CONSUMER_KEY`, and `WOOCOMMERCE_CONSUMER_SECRET` configured
  (see below), the sync fetches from WooCommerce's actual REST API
  `GET /wp-json/wc/v3/products` endpoint instead of the static fixture,
  following the `X-WP-TotalPages` response header across the full catalog.
  Nothing else about the sync behavior changes: same endpoint, same operator
  gate, same upsert-by-`(importSource, externalId)` semantics.

## What is explicitly NOT supported

- **No OAuth / multi-merchant onboarding.** Live mode uses a single store-
  level REST API consumer key/secret configured by the operator (your own
  WooCommerce store) — there is no "connect your WooCommerce store" flow for
  a third-party merchant yet.
- **One-way only.** Nothing is written back to WooCommerce, in fixture or
  live mode. "Read-only" in the roadmap item's name refers to this:
  CommerceBackend never mutates the source catalog.
- **No scheduled/automatic sync.** An operator triggers a sync explicitly;
  there is no polling or webhook-driven re-sync.
- **No conflict resolution beyond last-write-wins.** Re-syncing an existing
  imported listing overwrites its title/description/price/quantity/type with
  the source's current values; there's no diffing or partial-field merge.
- **No multi-currency support.** Both fixture and live mode treat product
  prices as USD; WooCommerce's per-store currency setting is not read.
- **No variation-level import.** Only top-level `Product` objects are read;
  WooCommerce's variable-product variations (`GET /products/<id>/variations`)
  are not fetched or imported as separate listings.
- **No stock-location awareness in live mode.** Live mode reads each
  product's top-level `stock_quantity` field as returned by the Products
  endpoint; it does not reconcile counts across multiple warehouses.

## Live Mode

By default `WOOCOMMERCE_SITE_URL`, `WOOCOMMERCE_CONSUMER_KEY`, and
`WOOCOMMERCE_CONSUMER_SECRET` are unset, so every sync reads the static
fixture — no setup, no credentials, no network call. To exercise the real
WooCommerce REST API instead:

1. In your own WordPress/WooCommerce site's admin, go to **WooCommerce →
   Settings → Advanced → REST API**, add a key with **Read** permissions, and
   copy its **Consumer key** and **Consumer secret**. This is never a
   third-party merchant's store credentials.
2. Note your store's site URL (e.g. `https://shop.example.com`).
3. Set in your `.env` (see `.env.example`):
   ```
   WOOCOMMERCE_SITE_URL=https://shop.example.com
   WOOCOMMERCE_CONSUMER_KEY=ck_your_woocommerce_consumer_key
   WOOCOMMERCE_CONSUMER_SECRET=cs_your_woocommerce_consumer_secret
   ```
4. Run `POST /v1/connectors/woocommerce/sync` as usual, or use the
   end-to-end self-test: `pnpm selftest:woocommerce`.

An empty, unset, or obviously-placeholder site URL, consumer key, or
consumer secret (containing `placeholder`, `your_`, `your-store`, or `mock`)
is always treated as "not configured" and falls back to the fixture — the
same convention `SHOPIFY_SHOP_DOMAIN`/`SHOPIFY_ACCESS_TOKEN` and
`BIGCOMMERCE_STORE_HASH`/`BIGCOMMERCE_ACCESS_TOKEN` use (see
`packages/connectors/shopify/src/live-client.ts` and
`packages/connectors/bigcommerce/src/live-client.ts`).

Authentication uses WooCommerce's documented HTTPS query-string method
(`consumer_key`/`consumer_secret` as query parameters), which the WooCommerce
REST API docs recommend for HTTPS sites — see
https://woocommerce.github.io/woocommerce-rest-api-docs/#authentication.

---

## 1. Sync WooCommerce Catalog

- **POST** `/v1/connectors/woocommerce/sync`
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
    "id": "sync_jkl012",
    "connector": "woocommerce",
    "sellerAgentId": "agent_seller_123",
    "status": "partial",
    "itemsImported": 3,
    "itemsFailed": 1,
    "errors": [
      { "externalId": "6004", "message": "WooCommerce product has no usable price." }
    ],
    "createdAt": "2026-10-09T00:00:00.000Z"
  }
}
```

`status` is `"success"` (no failures), `"partial"` (some items imported,
some failed), or `"failed"` (nothing imported — including when the catalog
source itself couldn't be reached at all, e.g. an invalid live consumer
key/secret or a network error; that case records a single entry in `errors`
describing the failure rather than any per-item mapping problem).

**Example curl:**

```bash
curl -X POST http://localhost:4000/v1/connectors/woocommerce/sync \
  -H "X-Operator-Key: your_operator_key" \
  -H "Content-Type: application/json" \
  -d '{"sellerAgentId": "agent_seller_123"}'
```

---

## 2. List Sync Logs

Sync logs across all connectors (Square, Shopify, BigCommerce, and
WooCommerce) share one endpoint:

- **GET** `/v1/connectors/sync-logs?limit=20&offset=0`
- **Auth:** `X-Operator-Key`.
- Returns recent sync log entries across all connectors, newest first. See
  `docs/api/connectors-square.md` for the response shape.

---

CommerceBackend is owned and maintained by Seeed LLC.

Seeed LLC is unrelated to Seeed Studio.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.
