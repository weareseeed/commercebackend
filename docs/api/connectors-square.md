# Square Catalog Connector (read-only spike)

> **Scope note:** This is weekly backlog item 9, "Square connector spike
> (read-only)" — the canonical imported-catalog model and connector
> abstraction that item 8 (a Shopify import spike) was meant to provide,
> applied to Square first. It is a **read-only spike**, not a production
> connector: there is no live Square API call anywhere in this feature — it
> reads a static fixture (`packages/connectors/square/src/fixtures/square-catalog-fixture.json`)
> standing in for a Square "List Catalog" response, maps each catalog item to
> CommerceBackend's canonical catalog shape, and writes ordinary `Listing`
> rows from it. No Square credentials exist anywhere in this repo.

## What is supported

- Mapping a Square-shaped catalog object (`CatalogObject`, `type: "ITEM"`)
  to CommerceBackend's canonical catalog item shape
  (`packages/connectors/square/src/types.ts`, meant to be reused by future
  connectors such as Shopify — only Square implements it so far).
- Importing that fixture into real `Listing` rows, owned by an operator-
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

## What is explicitly NOT supported

- **No live Square API integration.** This reads a static fixture only.
  Building a real Square OAuth + Catalog API client is out of scope for this
  spike.
- **One-way only.** Nothing is written back to Square. "Read-only" in the
  roadmap item's name refers to this: CommerceBackend never mutates the
  source catalog.
- **No scheduled/automatic sync.** An operator triggers a sync explicitly;
  there is no polling or webhook-driven re-sync.
- **No conflict resolution beyond last-write-wins.** Re-syncing an existing
  imported listing overwrites its title/description/price/quantity/type with
  the fixture's current values; there's no diffing or partial-field merge.
- **No Shopify/BigCommerce/WooCommerce connectors yet.** Those are still
  separate, unstarted roadmap items; only the canonical shape is meant to be
  shared with them.

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
some failed), or `"failed"` (nothing imported).

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
