# CommerceBackend v0.2.0 — Offers for Agent-Native Commerce

We are pleased to announce the release prep for **CommerceBackend v0.2.0**, introducing an agent-native marketplace negotiation layer ("Offers"), hardened checkout failure handling, and structured agent-discovery metadata.

---

## Summary

CommerceBackend v0.2.0 extends the core API features of v0.1.1 by allowing autonomous AI agents to negotiate prices and quantities transactionally. It also hardens the Stripe checkout intent lifecycle against database connectivity issues and introduces machine-readable metadata discovery standards (`llms.txt` and `.well-known/commercebackend.json`) to streamline integrations for software-agent procurement networks.

---

## What's New

### 1. Offers API (Agent-Native Negotiation)
Enables buyers and sellers to negotiate listing terms before moving to Stripe checkout:
* **Creation**: Buyers submit offers with specific prices, quantities, and expiration dates.
* **Negotiation**: Sellers can accept, reject, or submit counter-offers with updated price, quantity, and counter-expiration dates.
* **Accept Counter**: Buyers can accept the counter-offer terms, completing the negotiation loop.
* **Cancellation**: Buyers can cancel pending or countered offers at any time.
* **Audit Trail**: Every state transition generates a detailed history audit record in `OfferHistory`.

### 2. Checkout Failure Hardening
Prevents reuse of accepted offers and handles failure states robustly:
* **Checkout Reuse Protection**: Once a checkout intent is created for an accepted offer, the offer transitions to `checkout_pending`.
* **Stripe Session Error Isolation**:
  * If Stripe session creation fails *before* a session exists, the offer is reverted to `accepted` so the agent can retry.
  * If Stripe session creation succeeds but database persistence fails *afterward*, the offer is kept `checkout_pending` and logs a critical reconciliation alert (`CRITICAL RECONCILIATION NEEDED`) to prevent checkout reuse and duplicate intents.

### 3. Agent Discovery Metadata
Allows AI agents to locate and understand API capabilities:
* **/llms.txt**: A text-based configuration outlining project ownership, current capabilities, disambiguation, and roadmap.
* **/.well-known/commercebackend.json**: A machine-readable JSON structure describing current and planned capabilities, documentation entry points, and owner metadata.
* **/docs/agent-discovery.md**: Detailed integration guidance for autonomous agents.

---

## Offers API Endpoints

* `POST /v1/listings/:id/offers` — Submit a new offer (Buyer)
* `GET /v1/offers` — List offers filtered by role and status
* `GET /v1/offers/:id` — View specific offer details with audit history
* `POST /v1/offers/:id/accept` — Accept offer terms (Seller)
* `POST /v1/offers/:id/reject` — Reject offer/counter-offer (Buyer or Seller)
* `POST /v1/offers/:id/counter` — Submit a counter-offer (Seller)
* `POST /v1/offers/:id/accept-counter` — Accept seller's counter-offer terms (Buyer)
* `POST /v1/offers/:id/cancel` — Cancel pending or countered offer (Buyer)

---

## Checkout Integration

Buyers can purchase via accepted offers by passing an optional `offerId` parameter when creating a checkout intent:
```json
POST /v1/checkout-intents
{
  "listingId": "lst_xyz789",
  "quantity": 2,
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel",
  "offerId": "off_123"
}
```
The intent validates that the quantity matches the accepted offer, locks the price to the accepted offer amount, and transitions the offer status to `checkout_pending`.

---

## Database Migration Notes

The database schema updates are defined in `packages/db/prisma/migrations/20260524090000_offers/migration.sql`:
* Added `OfferStatus` enum.
* Created the `Offer` and `OfferHistory` tables.
* Added `offerId` column to `CheckoutIntent`.
* Enforces PostgreSQL CHECK constraints for positive quantities and prices:
  * `priceAmount > 0`
  * `counterPriceAmount IS NULL OR counterPriceAmount > 0`
  * `counterQuantity IS NULL OR counterQuantity > 0`

---

## Backward Compatibility

* **Legacy Checkout**: Creating Checkout Intents without an `offerId` continues to work at the standard listing price, preserving all v0.1.1 features.
* **Stripe Webhook Idempotency**: Stripe webhook processes remain untouched, preserving webhook idempotency and inventory checking behaviors.

---

## Known Limitations

* Database-level CHECK constraints are not executed during test suite runs because of database mocked environments.
* Offers are not automatically deleted or swept; expiration checks occur transactionally inline during mutations.

---

## Verification Results

* **Linting (`pnpm lint`)**: `[PASS]`
* **Type-Checking (`pnpm typecheck`)**: `[PASS]`
* **Unit & Integration Tests (`pnpm test`)**: `[36/36 PASS]`
* **Build Compilation (`pnpm build`)**: `[PASS]`

---

## Upgrade Notes

1. Run `pnpm install` to download updated dependencies.
2. Run `pnpm db:migrate` to apply the Offers table structures, indexes, and custom DB check constraints.
3. Restart the API server.

---

CommerceBackend is owned and maintained by Seeed LLC.
Copyright ©️ 2026 Seeed LLC. Licensed under Apache License 2.0.
Made with ♥️ by Seeed.
