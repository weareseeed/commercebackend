# UCP Protocol Adapter

## What "UCP" means here

There is no single canonical, widely-recognized external standard called
"Universal Commerce Protocol" referenced anywhere in this repository or its
docs. "UCP" in CommerceBackend is **CommerceBackend's own vendor-neutral,
schema.org-inspired commerce mapping layer** — a real, working, tested
adapter that decouples the internal listing/checkout-intent model from a
lightweight product/order shape. It is **not** a claim of conformance to any
named third-party "UCP" specification.

The mapping logic lives in `packages/protocols/ucp` (`@commercebackend/protocol-ucp`)
and is wired into three HTTP endpoints described below
(`apps/api/src/routes/protocol-ucp.ts`). Every endpoint is a translation
layer in front of CommerceBackend's existing, unmodified listing search and
`CheckoutService` — no Stripe or webhook code is touched by this adapter.

## Endpoints

All endpoints require header: `Authorization: Bearer <api_key>` (same agent
bearer auth as the native API; see `docs/api/native-api.md`).

### 1. List UCP products

- **GET** `/v1/protocols/ucp/products`
- **Auth**: any authenticated agent (buyer, seller, or both).
- **Query params**: `limit` (default 20, max 100), `offset` (default 0).
- Maps every active listing to a schema.org-`Product`/`Offer`-shaped object
  via `mapListingToUcpProduct`.
- **Response (200 OK):**
  ```json
  {
    "products": [
      {
        "id": "lst_xyz789",
        "name": "VIP Jazz Night Ticket",
        "description": "VIP ticket for Friday jazz night in Miami.",
        "offers": [{ "price": 8500, "currency": "USD" }]
      }
    ],
    "pagination": { "limit": 20, "offset": 0, "total": 1 }
  }
  ```
- **Example Curl**:
  ```bash
  curl -X GET "http://localhost:4000/v1/protocols/ucp/products?limit=20&offset=0" \
    -H "Authorization: Bearer cb_test_your_key_here"
  ```

### 2. Create a UCP order

- **POST** `/v1/protocols/ucp/orders` *(Requires buyer/both type)*
- **Body:** a UCP-shaped order-create request. CommerceBackend's internal
  checkout model supports **exactly one listing per checkout intent**, so
  `lineItems` must reference a single distinct `productId` (repeated line
  items for the *same* product are summed into one quantity; line items for
  *different* products are rejected with `400 UCP_MULTI_ITEM_UNSUPPORTED`,
  never silently truncated or merged).
  ```json
  {
    "lineItems": [{ "productId": "lst_xyz789", "quantity": 2 }],
    "successUrl": "http://localhost:3000/success?checkoutIntentId={CHECKOUT_INTENT_ID}",
    "cancelUrl": "http://localhost:3000/cancel?checkoutIntentId={CHECKOUT_INTENT_ID}",
    "offerId": "off_123"
  }
  ```
- Internally this is mapped via `mapUcpOrderCreateToCheckoutIntentInput` onto
  the existing `CreateCheckoutIntentInput` (from `@commercebackend/schemas`)
  and passed, unmodified, to `CheckoutService.createCheckoutIntent`. Every
  existing checkout rule still applies: inventory checks, self-purchase
  rejection, purchase-policy evaluation/human-approval gating, and offer
  state transitions.
- **Response (201 Created):**
  ```json
  {
    "order": {
      "id": "chk_123",
      "status": "payment_pending",
      "buyerId": "agent_buyer",
      "sellerId": "agent_seller",
      "lineItems": [{ "productId": "lst_xyz789", "quantity": 2 }],
      "totalPrice": { "amount": 17000, "currency": "USD" },
      "paymentUrl": "https://checkout.stripe.com/pay/cs_test_session_id_123"
    }
  }
  ```
  If a purchase policy requires human approval, the order is created with
  `status: "requires_human_review"` and `paymentUrl: null` — the buyer's own
  operator must approve or reject the underlying checkout intent through the
  existing native `POST /v1/checkout-intents/:id/approve` /
  `/v1/checkout-intents/:id/reject` operator endpoints (see
  `docs/api/native-api.md`); there is no UCP-specific approval endpoint.
- **Example Curl**:
  ```bash
  curl -X POST http://localhost:4000/v1/protocols/ucp/orders \
    -H "Authorization: Bearer cb_test_your_key_here" \
    -H "Content-Type: application/json" \
    -d '{"lineItems": [{"productId": "lst_xyz789", "quantity": 2}], "successUrl": "http://localhost:3000/success", "cancelUrl": "http://localhost:3000/cancel"}'
  ```

### 3. Get a UCP order

- **GET** `/v1/protocols/ucp/orders/:id`
- **Auth**: only the buyer or seller agent on the underlying checkout intent
  may view it (mirrors the access-control pattern in `GET /v1/orders/:id`).
  Any other authenticated agent receives `403 FORBIDDEN`.
- Maps the current internal checkout intent to the same UCP order shape as
  endpoint 2.
- **Response (200 OK):** same shape as the create-order response above.
- **Example Curl**:
  ```bash
  curl -X GET http://localhost:4000/v1/protocols/ucp/orders/chk_123 \
    -H "Authorization: Bearer cb_test_your_key_here"
  ```

## Order status mapping

Every internal `CheckoutIntentStatus` maps onto a UCP order `status`. The
mapping is total — every internal status has an entry, nothing is silently
dropped:

| Internal `CheckoutIntent.status` | UCP `order.status`    |
| --------------------------------- | ---------------------- |
| `open`                            | `payment_pending`      |
| `human_approval_required`         | `requires_human_review`|
| `human_approved`                  | `payment_pending`      |
| `human_rejected`                  | `rejected`             |
| `paid`                            | `paid`                 |
| `expired`                         | `expired`              |
| `cancelled`                       | `cancelled`            |
| `failed`                          | `failed`               |
| `payment_inventory_conflict`      | `failed`               |

`payment_inventory_conflict` — a rare race between a completed Stripe
payment and concurrently exhausted inventory — surfaces as `failed` because
it requires manual operator review today (see `docs/weekly-roadmap.md`
`[HUMAN-LED]` `payment_inventory_conflict` policy), not automatic order
fulfillment.

## Explicitly out of scope / unsupported

The UCP adapter is a mapping layer over CommerceBackend's existing
Stripe-hosted-checkout-URL redirect model, exactly as it works today for
native checkout intents. The following are **not implemented**, and are not
planned as part of this adapter without a dedicated design:

- Delegated or tokenized payment handoff (no payment credentials or tokens
  cross the UCP boundary; the buyer still follows the Stripe-hosted
  `paymentUrl`, same as native checkout intents).
- Order update or cancellation via the UCP endpoints (use the existing
  native checkout-intent/offer endpoints if applicable).
- Multi-item / multi-listing carts (CommerceBackend's internal model is
  single-listing-per-checkout; see the multi-item rejection behavior above).
- Tax calculation.
- Discounts or coupons.
- Refunds (money-path, human-led per `AGENTS.md`).
- A UCP-specific human-approval endpoint (use the native
  `/v1/checkout-intents/:id/approve` / `/reject` operator endpoints).

## Round-trip mapping tests

`packages/protocols/ucp/src/mappers.test.ts` covers:

- outbound listing → UCP product mapping;
- inbound UCP order-create request → `CreateCheckoutIntentInput` mapping,
  including the multi-distinct-product rejection;
- outbound internal checkout intent → UCP order mapping, including every
  status-mapping branch;
- a true round-trip: mapping an internal checkout intent to its UCP order
  shape and back confirms the original `listingId`/`quantity` are
  reconstructed unchanged.

Integration-level tests for the three HTTP endpoints live in
`apps/api/src/tests/api.test.ts`.

---

CommerceBackend is owned and maintained by Seeed LLC.

Seeed LLC is unrelated to Seeed Studio.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.
