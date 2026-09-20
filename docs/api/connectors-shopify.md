# Shopify Catalog Connector (read-only, fixture by default, optional live sandbox)

> **Scope note:** This is weekly backlog item 8, "Connector abstraction +
> Shopify import spike (read-only)." It reuses the canonical imported-catalog
> model and sync-log pattern that shipped with the Square connector spike
> (`docs/api/connectors-square.md`, weekly item 9), applied to a Shopify-shaped
> catalog. This is still a **read-only** connector — nothing is ever written
> back to Shopify. By default it reads a static fixture
> (`packages/connectors/shopify/src/fixtures/shopify-catalog-fixture.json`)
> standing in for a Shopify Admin API `GET /admin/api/2024-01/products.json`
> response, with no live API call and no credentials needed. Configuring a
> real `SHOPIFY_SHOP_DOMAIN` and `SHOPIFY_ACCESS_TOKEN` switches it to fetch
> from an actual Shopify store instead — a Shopify **development/sandbox
> store** by convention (whichever store `SHOPIFY_SHOP_DOMAIN` names; there is
> no separate sandbox vs. production API host the way Square has). Either way,
> each product is mapped to CommerceBackend's canonical catalog shape and
> written as ordinary `Listing` rows.

## What is supported

- Mapping a Shopify-shaped `Product` object to CommerceBackend's canonical
  catalog item shape (`packages/connectors/shopify/src/types.ts`), the same
  shape the Square connector maps into.
- Importing that fixture into real `Listing` rows, owned by an operator-
  specified seller agent, keyed on `(importSource, externalId)` so re-running
  the sync **updates** the same listings instead of duplicating them.
- A `CatalogSyncLog` row recording the outcome of every sync: how many items
  imported, how many failed, and why.
- Per-item failure isolation: one malformed product (e.g. missing a variant
  price) is recorded in the sync log's `errors` array and skipped — it does
  not abort the rest of the batch.
- Draft/archived Shopify products are skipped as not agent-shoppable, without
  being counted as sync failures.
- Imported listings are ordinary, unmodified `Listing` rows: they show up
  through the existing, unchanged `/v1/search` and `/v1/listings/:id`
  endpoints exactly like natively-created listings. No new agent-facing
  capability was added for buyer/seller agents.
- **Optional live Shopify sandbox mode.** With a real `SHOPIFY_SHOP_DOMAIN`
  and `SHOPIFY_ACCESS_TOKEN` configured (see below), the sync fetches from
  Shopify's actual Admin API `GET /products.json` endpoint instead of the
  static fixture, following `Link`-header pagination across the full catalog.
  Nothing else about the sync behavior changes: same endpoint, same operator
  gate, same upsert-by-`(importSource, externalId)` semantics.

## What is explicitly NOT supported

- **No OAuth / multi-merchant onboarding.** Live mode uses a single Admin API
  access token configured by the operator (your own Shopify development
  store) — there is no "connect your Shopify store" flow for a third-party
  merchant yet.
- **One-way only.** Nothing is written back to Shopify, in fixture or live
  mode. "Read-only" in the roadmap item's name refers to this: CommerceBackend
  never mutates the source catalog.
- **No scheduled/automatic sync.** An operator triggers a sync explicitly;
  there is no polling or webhook-driven re-sync.
- **No conflict resolution beyond last-write-wins.** Re-syncing an existing
  imported listing overwrites its title/description/price/quantity/type with
  the source's current values; there's no diffing or partial-field merge.
- **No multi-currency support.** Both fixture and live mode treat variant
  prices as USD; Shopify's per-store currency setting is not read.
- **Single variant only.** Both the fixture and live mode map only
  `variants[0]` of each product; additional variants (sizes, colors, SKUs)
  are ignored.
- **No inventory-location awareness in live mode.** Live mode reads each
  variant's top-level `inventory_quantity` field as returned by the Products
  endpoint; it does not call Shopify's separate Inventory Levels API to
  reconcile counts across multiple locations.
- **No BigCommerce/WooCommerce connectors yet.** Those are still separate,
  unstarted roadmap items; only the canonical shape is meant to be shared
  with them.

## Live Sandbox Mode

By default `SHOPIFY_SHOP_DOMAIN` and `SHOPIFY_ACCESS_TOKEN` are unset, so
every sync reads the static fixture — no setup, no credentials, no network
call. To exercise the real Shopify Admin API instead:

1. Create (or use an existing) Shopify **development store** — Shopify's
   sandbox environment for testing, available free from the
   [Shopify Partner Dashboard](https://www.shopify.com/partners) or via
   Shopify's dev store creation flow. This is never a real merchant's live
   store.
2. In that store's admin, go to **Settings → Apps and sales channels →
   Develop apps**, create a custom app, and grant it `read_products` Admin
   API access. Install the app and copy its **Admin API access token**
   (starts with `shpat_`).
3. Set in your `.env` (see `.env.example`):
   ```
   SHOPIFY_SHOP_DOMAIN=your-dev-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=shpat_your_admin_api_access_token
   ```
4. Run `POST /v1/connectors/shopify/sync` as usual, or use the end-to-end
   self-test: `pnpm selftest:shopify`.

An empty, unset, or obviously-placeholder shop domain or token (containing
`placeholder`, `your-`, or `your_`) is always treated as "not configured" and
falls back to the fixture — the same convention `SQUARE_ACCESS_TOKEN` and
`STRIPE_SECRET_KEY` use (see `packages/connectors/square/src/live-client.ts`
and `packages/payments/stripe/src/client.ts`).

---

## 1. Sync Shopify Catalog

- **POST** `/v1/connectors/shopify/sync`
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
    "id": "sync_def456",
    "connector": "shopify",
    "sellerAgentId": "agent_seller_123",
    "status": "partial",
    "itemsImported": 3,
    "itemsFailed": 1,
    "errors": [
      { "externalId": "9004", "message": "Shopify product has no usable variants[0].price." }
    ],
    "createdAt": "2026-09-18T00:00:00.000Z"
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
curl -X POST http://localhost:4000/v1/connectors/shopify/sync \
  -H "X-Operator-Key: your_operator_key" \
  -H "Content-Type: application/json" \
  -d '{"sellerAgentId": "agent_seller_123"}'
```

---

## 2. List Sync Logs

Sync logs across all connectors (Square and Shopify) share one endpoint:

- **GET** `/v1/connectors/sync-logs?limit=20&offset=0`
- **Auth:** `X-Operator-Key`.
- Returns recent sync log entries across all connectors, newest first. See
  `docs/api/connectors-square.md` for the response shape.

---

CommerceBackend is owned and maintained by Seeed LLC.

Seeed LLC is unrelated to Seeed Studio.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.
