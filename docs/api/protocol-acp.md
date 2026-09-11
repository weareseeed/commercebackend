# ACP Protocol Adapter (v0.2 scoped subset)

> **Scope note:** This is CommerceBackend's own scoped subset of the public
> [Agentic Commerce Protocol (ACP)](https://github.com/agenticcommerceprotocol)
> — the OpenAI/Stripe spec for agentic checkout (a product feed format plus a
> Checkout Sessions API using a delegated payment token). It is **not** a
> certified or full ACP spec implementation. It maps a real, working subset of
> ACP-shaped requests/responses onto CommerceBackend's existing, unmodified
> Stripe-hosted-checkout-redirect flow (`CheckoutService.createCheckoutIntent`
> and friends) — no Stripe or webhook code was changed to build this adapter.

All requests and responses use JSON. All three endpoints require
`Authorization: Bearer <api_key>` like the rest of the [native API](./native-api.md).

## What is supported

- **Product feed**: active listings mapped to an ACP-shaped catalog item.
- **Checkout sessions**: create and read a single-listing checkout session,
  backed by CommerceBackend's existing Stripe-hosted checkout URL redirect.

## What is explicitly NOT supported

These are deliberately out of scope for this adapter and are not implemented:

- **Delegated payment token / `shared_payment_token` PSP handoff.** ACP's
  spec supports a PSP-issued delegated payment token so the buyer's agent
  never redirects to a hosted page. CommerceBackend does not implement this —
  every ACP checkout session here still resolves to a Stripe-hosted
  `checkout_url` redirect, exactly like a native checkout intent.
- **Checkout session update or cancel.** There is no `PATCH`/cancel endpoint
  for an in-flight ACP checkout session.
- **Multi-item carts.** CommerceBackend's internal model is single-listing
  per checkout. An ACP request with more than one *distinct* listing ID is
  rejected with `400 ACP_UNSUPPORTED_REQUEST`, not silently truncated to one
  item.
- **Tax.**
- **Discounts / promotions.**
- **Refunds.**

Anything above is either genuinely unimplemented or intentionally mapped onto
CommerceBackend's existing hosted-redirect checkout model. Do not represent
this adapter as full ACP spec compliance.

---

## 1. Get Product Feed

- **GET** `/v1/protocols/acp/product-feed?limit=20&offset=0`
- **Auth:** any authenticated agent (`Authorization: Bearer <api_key>`).
- Returns active listings (mirrors `ListingsService.listPublicListings`,
  the same active-listings source used by the public listing browse path)
  mapped to an ACP-shaped catalog item.

**Response (200 OK):**

```json
{
  "items": [
    {
      "id": "lst_xyz789",
      "title": "VIP Jazz Night Ticket",
      "description": "VIP ticket for Friday jazz night in Miami.",
      "price": { "amount": 8500, "currency": "USD" },
      "availability": "in_stock",
      "quantity_available": 42
    }
  ],
  "pagination": { "limit": 20, "offset": 0 }
}
```

**Example curl:**

```bash
curl -X GET "http://localhost:4000/v1/protocols/acp/product-feed?limit=20&offset=0" \
  -H "Authorization: Bearer cb_test_your_key_here"
```

---

## 2. Create Checkout Session

- **POST** `/v1/protocols/acp/checkout-sessions` *(Requires buyer/both agent type)*
- **Auth:** `Authorization: Bearer <api_key>` — the authenticated agent is the
  buyer; ACP's `buyer` object is not accepted as input.
- Body is an ACP-shaped checkout-session-create request. `items` must
  reference exactly one distinct listing ID (matching CommerceBackend's
  single-listing-per-checkout internal model); repeated line items for the
  same listing have their quantities summed, but more than one distinct
  listing ID is rejected with `400 ACP_UNSUPPORTED_REQUEST`.
- `success_url` / `cancel_url` are CommerceBackend-specific fields not part
  of the public ACP spec (which does not need them under the delegated-token
  flow); they are required here because this subset only supports the
  hosted-redirect flow. `offer_id` is a CommerceBackend extension for
  checking out a pre-negotiated, already-accepted offer — the public ACP
  spec has no offer-negotiation concept.
- Internally, this maps to `CreateCheckoutIntentInput` and calls the
  existing, unmodified `CheckoutService.createCheckoutIntent` — the same
  purchase-policy evaluation, inventory checks, and Stripe session creation
  used by `POST /v1/checkout-intents` apply unchanged.

**Body:**

```json
{
  "items": [{ "id": "lst_xyz789", "quantity": 2 }],
  "success_url": "https://buyer.example.com/success",
  "cancel_url": "https://buyer.example.com/cancel"
}
```

**Response (201 Created):**

```json
{
  "checkoutSession": {
    "id": "chk_123",
    "status": "ready_for_payment",
    "line_items": [{ "id": "lst_xyz789", "quantity": 2, "amount_total": 17000 }],
    "totals": { "subtotal": 17000, "total": 17000, "currency": "USD" },
    "payment_provider": {
      "type": "commercebackend_stripe_hosted_redirect",
      "checkout_url": "https://checkout.stripe.com/pay/cs_test_session_id_123"
    },
    "buyer_agent_id": "agent_buyer",
    "seller_agent_id": "agent_seller",
    "commercebackend_status": "open",
    "created_at": "2026-05-24T00:00:00.000Z",
    "updated_at": "2026-05-24T00:00:00.000Z"
  }
}
```

`status` is a best-effort mapping of CommerceBackend's internal checkout
intent status onto ACP's coarser status vocabulary
(`not_ready_for_payment` | `ready_for_payment` | `completed` | `canceled`).
`commercebackend_status` always carries the exact internal status (including
states ACP has no equivalent for, such as `human_approval_required`) so no
information is lost in translation.

If the buyer's purchase policy requires human approval, the session is
created with `commercebackend_status: "human_approval_required"`,
`status: "not_ready_for_payment"`, and a `null` `checkout_url` — approve or
reject it via the existing operator endpoints
(`POST /v1/checkout-intents/:id/approve` / `.../reject`), same as a native
checkout intent; there is no ACP-shaped equivalent for those operator
actions.

**Example curl:**

```bash
curl -X POST http://localhost:4000/v1/protocols/acp/checkout-sessions \
  -H "Authorization: Bearer cb_test_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"id": "lst_xyz789", "quantity": 2}], "success_url": "https://buyer.example.com/success", "cancel_url": "https://buyer.example.com/cancel"}'
```

---

## 3. Get Checkout Session

- **GET** `/v1/protocols/acp/checkout-sessions/:id`
- **Auth:** `Authorization: Bearer <api_key>` — only the buyer or seller
  agent on the underlying checkout intent may view it (same
  read-access-control pattern as `GET /v1/orders/:id`); any other agent gets
  `403 FORBIDDEN`.
- Maps the current internal checkout intent to the same ACP checkout-session
  shape as the create response above.

**Example curl:**

```bash
curl -X GET http://localhost:4000/v1/protocols/acp/checkout-sessions/chk_123 \
  -H "Authorization: Bearer cb_test_your_key_here"
```

---

CommerceBackend is owned and maintained by Seeed LLC.

Seeed LLC is unrelated to Seeed Studio.

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.
